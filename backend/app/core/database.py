# Database Configuration - SQLAlchemy Setup
# v1.2.0-alpha.2

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from .config import settings

# Create SQLAlchemy Engine
use_sqlite_env = os.getenv("USE_SQLITE")
if use_sqlite_env is not None:
    USE_SQLITE = use_sqlite_env.strip().lower() in ("1", "true", "yes")
else:
    USE_SQLITE = settings.POSTGRES_HOST in ("localhost", "127.0.0.1")

database_url = "sqlite:///./test.db" if USE_SQLITE else settings.DATABASE_URL

engine = create_engine(
    database_url,
    pool_pre_ping=True,  # Verify connections before using them
    pool_recycle=3600,   # Recycle connections after 1 hour
    echo=settings.DEBUG  # Log SQL queries in debug mode
)

# Create Session Local
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()


def get_db():
    """Dependency for FastAPI to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database tables"""
    if not USE_SQLITE:
        init_db_env = os.getenv("INIT_DB", "").strip().lower()
        if init_db_env not in ("1", "true", "yes"):
            print("Skipping init_db (INIT_DB not set for Postgres)")
            return
    # Import all models
    from app.models import user, tournament, participant, group, match, league, location, access_request
    from app.models.platform import app, permission, feedback, deployment
    Base.metadata.create_all(bind=engine)
    print("Database tables initialized")

