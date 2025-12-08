from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional


class Settings(BaseSettings):
    # App
    app_name: str = "EUSuite Company Admin API"
    app_version: str = "1.0.0"
    debug: bool = False
    
    # Database
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/eusuite_company"
    
    # Redis
    redis_url: str = "redis://localhost:6379/0"
    
    # JWT
    jwt_secret_key: str = "your-super-secret-key-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30
    jwt_refresh_token_expire_days: int = 7
    
    # Public API (for auth validation)
    public_api_url: str = "http://localhost:8000/api/v1"
    
    # Storage
    storage_backend: str = "local"  # local, s3
    local_storage_path: str = "./uploads"
    s3_bucket: str = ""
    s3_region: str = "eu-west-1"
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    
    # Kubernetes
    k8s_in_cluster: bool = False
    k8s_config_path: Optional[str] = None
    k8s_namespace_prefix: str = "company-"
    
    # Branding
    default_primary_color: str = "#1e5631"
    default_secondary_color: str = "#d4af37"
    branding_assets_path: str = "./branding"
    
    # CORS
    cors_origins: list = ["http://localhost:3000", "https://company.eusuite.eu"]
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
