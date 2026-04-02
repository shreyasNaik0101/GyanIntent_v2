"""Application configuration."""

import json
from functools import lru_cache
from typing import Annotated, List

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode


class Settings(BaseSettings):
    """Application settings."""
    
    # App
    APP_NAME: str = "Gyan_Intent"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "production"
    LOG_LEVEL: str = "INFO"
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # CORS
    CORS_ORIGINS: Annotated[
        List[str],
        NoDecode,
    ] = ["http://localhost:3000", "https://gyanintent.com"]
    
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://user:pass@localhost/gyanintent"
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Authentication
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # AI APIs
    OPENAI_API_KEY: str = ""
    SARVAM_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    HF_API_KEY: str = ""
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    MANIM_DEBUG_MODEL: str = "openai/gpt-oss-120b"
    MANIM_FALLBACK_MODEL: str = "gpt-4o-mini"
    
    # WhatsApp Bot (wwebjs)
    WHATSAPP_BOT_URL: str = "http://localhost:3003"
    
    # Telegram Bot
    TELEGRAM_BOT_TOKEN: str = ""
    
    # Video Generation
    VIDEO_OUTPUT_DIR: str = "./media/output"
    VIDEO_TEMP_DIR: str = "./media/temp"
    MAX_VIDEO_DURATION: int = 120  # seconds
    MANIM_MAX_RETRIES: int = 2
    MANIM_TIMEOUT_SECONDS: int = 90
    
    # Google Classroom OAuth
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/v1/classroom/callback"
    
    # Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: object) -> object:
        """Accept JSON arrays or simple comma-separated origin strings."""
        if isinstance(value, list):
            return value

        if isinstance(value, str):
            text = value.strip()
            if not text:
                return []

            try:
                parsed = json.loads(text)
                if isinstance(parsed, list):
                    return parsed
            except json.JSONDecodeError:
                pass

            text = text.strip("[]")
            return [
                item.strip().strip('"').strip("'")
                for item in text.split(",")
                if item.strip()
            ]

        return value
    
    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
