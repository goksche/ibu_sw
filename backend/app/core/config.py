# Core Configuration - Pydantic Settings
# v1.2.0-alpha.2

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application Settings from Environment Variables"""
    
    # App Info
    APP_NAME: str = "IBU Turniere API"
    APP_VERSION: str = "1.2.0-alpha.1"
    DEBUG: bool = False
    
    # Database
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "ibu_turniere"
    POSTGRES_USER: str = "ibu_admin"
    POSTGRES_PASSWORD: str = "changeme"
    
    @property
    def DATABASE_URL(self) -> str:
        """Construct PostgreSQL Database URL"""
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
    
    # Security
    SECRET_KEY: str = "changeme-change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:5173"]
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# Global Settings Instance
settings = Settings()

