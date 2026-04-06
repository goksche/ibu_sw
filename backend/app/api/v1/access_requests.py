# Access Requests (Zugangs-Anfragen) – öffentlicher Endpoint für Landing Page
# Kein Auth; Honeypot-Spam-Schutz; DB-Speicherung; E-Mail an goksche23@gmail.com

import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import settings
from app.models.access_request import AccessRequest
from app.schemas.access_request import AccessRequestCreate, AccessRequestResponse

router = APIRouter(tags=["Access Requests"])
logger = logging.getLogger(__name__)


def send_access_request_notification(name: str, email: str, sport: str, organisation: Optional[str], source: Optional[str]) -> bool:
    """E-Mail bei neuer Zugangs-Anfrage: von noreply@gsmartsol.ch an goksche23@gmail.com."""
    if not settings.SMTP_HOST:
        logger.warning("SMTP not configured - cannot send access request notification.")
        return False
    smtp_from = settings.ACCESS_REQUEST_FROM_EMAIL
    smtp_to = settings.ACCESS_REQUEST_TO_EMAIL
    try:
        msg = MIMEMultipart()
        msg["From"] = smtp_from
        msg["To"] = smtp_to
        msg["Subject"] = "finalstage – Neue Zugangs-Anfrage"
        org_line = f"Organisation: {organisation}\n" if organisation else ""
        source_line = f"Woher: {source}\n" if source else ""
        body = f"""Neue Zugangs-Anfrage von der Landing Page:

Name: {name}
E-Mail: {email}
Sportart: {sport}
{org_line}{source_line}
Rückmeldung erfolgt persönlich.
"""
        msg.attach(MIMEText(body, "plain"))
        server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)
        if settings.SMTP_USE_TLS:
            server.starttls()
        if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
        server.sendmail(smtp_from, [smtp_to], msg.as_string())
        server.quit()
        logger.info("Access request notification sent to %s", smtp_to)
        return True
    except Exception as e:
        logger.exception("Failed to send access request email: %s", e)
        return False


@router.post("/access-requests", response_model=AccessRequestResponse)
async def create_access_request(body: AccessRequestCreate, db: Session = Depends(get_db)):
    """
    Zugangs-Anfrage von der Landing Page.
    Honeypot-Feld 'website': wenn ausgefüllt → 200 OK, aber keine Speicherung (Spam).
    Sonst: Speicherung in DB und E-Mail an goksche23@gmail.com.
    """
    if body.website and body.website.strip():
        logger.info("Access request ignored (honeypot filled).")
        return AccessRequestResponse(success=True, message="Anfrage wurde gesendet.")
    record = AccessRequest(
        name=body.name,
        email=body.email,
        sport=body.sport,
        organisation=body.organisation,
        source=body.source,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    logger.info("Access request saved: id=%s email=%s", record.id, body.email)
    send_access_request_notification(
        name=body.name,
        email=body.email,
        sport=body.sport,
        organisation=body.organisation,
        source=body.source,
    )
    return AccessRequestResponse(success=True, message="Anfrage wurde gesendet.")
