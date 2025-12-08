from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    app_name: str = "EUSuite Website Backend"
    debug: bool = False
    
    # Database
    database_url: str = "sqlite:///./eusuite_public.db"
    
    # Security
    secret_key: str = "your-secret-key-change-in-production"
    algorithm: str = "HS256"
    
    # Email
    smtp_host: str = "localhost"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = "noreply@eusuite.eu"
    
    # Admin backend URL (for creating tenants)
    admin_backend_url: str = "http://euadmin-backend:8000"
    admin_api_key: str = "internal-api-key"
    
    # Frontend URLs
    company_portal_url: str = "https://portal.eusuite.eu"
    
    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
