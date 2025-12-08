"""
EUAdmin Backend - Admin Monitoring and Control Dashboard
Configuration settings for the admin backend service.
"""
import os
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Admin Authentication
    ADMIN_EMAIL: str = "admin@test.nl"
    # Plain password for dev, or Argon2 hash for production
    # Generate hash: python -c "from argon2 import PasswordHasher; print(PasswordHasher().hash('YOUR_PASSWORD'))"
    ADMIN_PASSWORD_HASH: str = "admin123"
    ADMIN_JWT_SECRET: str = os.getenv("ADMIN_JWT_SECRET", "super-secret-admin-key-change-in-production")
    ADMIN_JWT_ALGORITHM: str = "HS256"
    ADMIN_JWT_EXPIRE_HOURS: int = 24
    
    # EUCloud Backend Connection
    EUCLOUD_BACKEND_URL: str = os.getenv("EUCLOUD_BACKEND_URL", "http://eucloud-backend:8000")
    
    # Database (shared with EUCloud for user data)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://eucloud:eucloud@postgres:5432/eucloud")
    
    # Kubernetes API
    KUBERNETES_IN_CLUSTER: bool = os.getenv("KUBERNETES_IN_CLUSTER", "true").lower() == "true"
    KUBE_NAMESPACE: str = os.getenv("KUBE_NAMESPACE", "eucloud")
    
    # CORS
    CORS_ORIGINS: list = [
        "http://localhost:5173",
        "http://localhost:5180",
        "http://192.168.124.50:30090",
        "http://192.168.124.50:30080",
    ]
    
    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
