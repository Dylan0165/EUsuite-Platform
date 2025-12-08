from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional


class Settings(BaseSettings):
    """Superadmin Portal Configuration"""
    
    # Application
    APP_NAME: str = "EUSuite Superadmin Portal"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"
    
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://eusuite:eusuite@localhost:5432/eusuite_superadmin"
    DATABASE_ECHO: bool = False
    DATABASE_POOL_SIZE: int = 20
    DATABASE_MAX_OVERFLOW: int = 30
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/2"
    
    # JWT Authentication
    JWT_SECRET_KEY: str = "superadmin-secret-key-change-in-production-2024"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Superadmin credentials (initial setup)
    SUPERADMIN_EMAIL: str = "admin@eusuite.eu"
    SUPERADMIN_PASSWORD: str = "EUSuite2024!"
    
    # Stripe
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_PUBLISHABLE_KEY: str = ""
    
    # Kubernetes
    K8S_IN_CLUSTER: bool = False
    K8S_CONFIG_PATH: Optional[str] = None
    K8S_NAMESPACE_PREFIX: str = "tenant-"
    
    # Port allocation range for tenant services
    PORT_RANGE_START: int = 30100
    PORT_RANGE_END: int = 31000
    
    # CORS
    CORS_ORIGINS: list = ["http://localhost:3000", "http://localhost:5173", "https://admin.eusuite.eu"]
    
    # Storage
    UPLOAD_DIR: str = "/app/uploads"
    MAX_UPLOAD_SIZE: int = 104857600  # 100MB
    
    # Email (for sending notifications)
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "noreply@eusuite.eu"
    
    # Metrics
    ENABLE_METRICS: bool = True
    
    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
