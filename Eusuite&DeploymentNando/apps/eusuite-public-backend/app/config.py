"""
EUSuite Public Backend - Configuration
"""
import os
from functools import lru_cache
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # App Settings
    APP_NAME: str = "EUSuite Public API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    SECRET_KEY: str = "change-this-in-production-use-strong-secret-key"
    
    # Database
    DATABASE_URL: str = "postgresql://eusuite:eusuite@localhost:5432/eusuite_public"
    
    # Redis (for sessions and caching)
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # JWT Settings
    JWT_SECRET_KEY: str = "jwt-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "https://eusuite.eu",
        "https://www.eusuite.eu",
    ]
    
    # Stripe Payment
    STRIPE_SECRET_KEY: str = ""
    STRIPE_PUBLISHABLE_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    
    # Email Settings (SMTP)
    SMTP_HOST: str = "smtp.eusuite.eu"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "noreply@eusuite.eu"
    SMTP_FROM_NAME: str = "EUSuite"
    
    # Kubernetes
    KUBE_CONFIG_PATH: str = ""
    KUBE_NAMESPACE_PREFIX: str = "tenant-"
    
    # URLs
    PUBLIC_URL: str = "https://eusuite.eu"
    COMPANY_ADMIN_URL: str = "https://company.eusuite.eu"
    SUPERADMIN_URL: str = "https://admin.eusuite.eu"
    
    # Pricing Plans (in cents)
    PLAN_PARTICULIER_PRICE: int = 0  # Free
    PLAN_BUSINESS_PRICE: int = 1499  # €14.99/month per user
    PLAN_ENTERPRISE_PRICE: int = 2999  # €29.99/month per user
    
    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
