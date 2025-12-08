"""
EUAdmin Backend - Tenant Database Connection
Manages connections to the tenant admin database (SQLite).
"""
import os
import logging
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
from contextlib import contextmanager
from typing import Generator

from .models import Base

logger = logging.getLogger(__name__)

# Tenant database path - separate from EUCloud user database
TENANT_DB_PATH = os.getenv("TENANT_DB_PATH", "/app/data/tenant.db")
TENANT_DB_URL = os.getenv("TENANT_DB_URL", f"sqlite:///{TENANT_DB_PATH}")

logger.info(f"Tenant database: {TENANT_DB_URL}")

# Create engine for tenant database
tenant_engine = create_engine(
    TENANT_DB_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
    echo=False
)

# Enable foreign keys for SQLite
@event.listens_for(tenant_engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()

TenantSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=tenant_engine)


def init_tenant_db():
    """Initialize tenant database - create all tables."""
    import os
    
    # Ensure directory exists
    db_dir = os.path.dirname(TENANT_DB_PATH)
    if db_dir and not os.path.exists(db_dir):
        os.makedirs(db_dir, exist_ok=True)
        logger.info(f"Created database directory: {db_dir}")
    
    # Create all tables
    Base.metadata.create_all(bind=tenant_engine)
    logger.info("Tenant database tables created/verified")


def get_tenant_db() -> Generator[Session, None, None]:
    """FastAPI dependency for getting tenant database session."""
    db = TenantSessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def get_tenant_session() -> Generator[Session, None, None]:
    """Context manager for tenant database session."""
    session = TenantSessionLocal()
    try:
        yield session
        session.commit()
    except Exception as e:
        session.rollback()
        logger.error(f"Tenant database error: {e}")
        raise
    finally:
        session.close()
