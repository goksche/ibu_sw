"""
Mini-API nur für gsmartsol.ch „Notify me“ – läuft auf Server C mit lokaler PostgreSQL.
"""
from __future__ import annotations

import logging
import smtplib
from datetime import datetime, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import Column, DateTime, Integer, String, create_engine, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, declarative_base, sessionmaker

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("gsmartsol_api")

Base = declarative_base()


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str  # postgresql+psycopg2://...
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USERNAME: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_USE_TLS: bool = True
    NOTIFY_FROM_EMAIL: str = "noreply@gsmartsol.ch"
    NOTIFY_TO_EMAIL: str = "goksche23@gmail.com"


settings = Settings()

engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Subscriber(Base):
    __tablename__ = "gsmartsol_notify_subscribers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), nullable=False, unique=True, index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())


class NotifyIn(BaseModel):
    email: EmailStr
    website: Optional[str] = Field(default="", description="Honeypot")


class NotifyOut(BaseModel):
    success: bool
    message: str


app = FastAPI(title="GSmartSol Notify API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    Base.metadata.create_all(bind=engine)


def _send_admin_mail(subscriber_email: str) -> bool:
    if not settings.SMTP_HOST:
        logger.warning("SMTP not configured – admin notification skipped.")
        return False
    try:
        msg = MIMEMultipart()
        msg["From"] = settings.NOTIFY_FROM_EMAIL
        msg["To"] = settings.NOTIFY_TO_EMAIL
        msg["Subject"] = "gsmartsol.ch – Notify me"
        ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
        body = f"""Neue Notify-me-Eintragung (gsmartsol.ch Landing):

E-Mail: {subscriber_email}
Zeitpunkt: {ts}
"""
        msg.attach(MIMEText(body, "plain"))
        server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)
        if settings.SMTP_USE_TLS:
            server.starttls()
        if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
        server.sendmail(settings.NOTIFY_FROM_EMAIL, [settings.NOTIFY_TO_EMAIL], msg.as_string())
        server.quit()
        return True
    except Exception as e:
        logger.exception("SMTP failed: %s", e)
        return False


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "gsmartsol-notify"}


@app.post("/api/v1/gsmartsol/notify", response_model=NotifyOut)
def notify(body: NotifyIn) -> NotifyOut:
    if body.website and body.website.strip():
        logger.info("honeypot")
        return NotifyOut(success=True, message="Vielen Dank.")

    email_norm = str(body.email).strip().lower()

    db: Session = SessionLocal()
    is_new = False
    try:
        sub = Subscriber(email=email_norm)
        db.add(sub)
        db.commit()
        db.refresh(sub)
        is_new = True
    except IntegrityError:
        db.rollback()
        logger.info("duplicate email %s", email_norm)
        return NotifyOut(
            success=True,
            message="Vielen Dank. Wir melden uns, sobald es Neuigkeiten gibt.",
        )
    finally:
        db.close()

    if is_new and settings.SMTP_HOST:
        if not _send_admin_mail(email_norm):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="E-Mail konnte nicht gesendet werden. Bitte später erneut versuchen.",
            )
    elif is_new and not settings.SMTP_HOST:
        logger.info("subscriber saved without SMTP: %s", email_norm)

    return NotifyOut(
        success=True,
        message="Vielen Dank. Wir melden uns, sobald es Neuigkeiten gibt.",
    )
