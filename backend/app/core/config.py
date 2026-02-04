# Core Configuration - Pydantic Settings
# v1.2.0-alpha.2

from pydantic_settings import BaseSettings
from typing import Optional
from urllib.parse import quote_plus


class Settings(BaseSettings):
    """Application Settings from Environment Variables"""
    
    # App Info
    APP_NAME: str = "IBU Turniere API"
    APP_VERSION: str = "1.4.1"
    DEBUG: bool = False
    
    # Database
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "ibu_turniere"
    POSTGRES_USER: str = "ibu_admin"
    POSTGRES_PASSWORD: str = "changeme"
    
    @property
    def DATABASE_URL(self) -> str:
        """Construct PostgreSQL Database URL with URL-encoded password"""
        encoded_password = quote_plus(self.POSTGRES_PASSWORD)
        encoded_user = quote_plus(self.POSTGRES_USER)
        return f"postgresql://{encoded_user}:{encoded_password}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
    
    # Security
    SECRET_KEY: str = "changeme-change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 600

    # OTP / Email
    OTP_EXPIRY_MINUTES: int = 10
    OTP_LENGTH: int = 6
    OTP_DEV_MODE: bool = False
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USERNAME: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM: Optional[str] = None
    SMTP_USE_TLS: bool = True

    # Zugangs-Anfragen (Landing Page): E-Mail-Benachrichtigung
    ACCESS_REQUEST_FROM_EMAIL: str = "noreply@gsmartsol.ch"
    ACCESS_REQUEST_TO_EMAIL: str = "goksche23@gmail.com"

    # CORS (komma-separierte Liste als String) - Allow all for local development
    CORS_ORIGINS: str = "*"
    
    @property
    def CORS_ORIGINS_LIST(self) -> list[str]:
        """Parse CORS origins from comma-separated string"""
        if isinstance(self.CORS_ORIGINS, str):
            return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]
        return self.CORS_ORIGINS if isinstance(self.CORS_ORIGINS, list) else ["*"]
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    # Platform Settings
    UPLOAD_DIR: str = "/app/uploads"
    NGINX_CONF_DIR: str = "/etc/nginx/conf.d"
    NGINX_APPS_CONF: str = "/etc/nginx/conf.d/apps.conf"
    DOCKER_SOCKET: str = "/var/run/docker.sock"
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# Global Settings Instance
settings = Settings()

