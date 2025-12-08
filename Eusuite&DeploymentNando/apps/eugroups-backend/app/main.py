"""
EUGroups Backend - Collaborative Groups Application
Features: Groups, Channels, Real-time Chat (WebSocket), Kanban Boards
"""
import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import init_db
from .routers import groups, channels, boards, users, dm

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle events"""
    # Startup
    logger.info("Starting EUGroups Backend...")
    init_db()
    logger.info("Database initialized")
    yield
    # Shutdown
    logger.info("Shutting down EUGroups Backend...")


app = FastAPI(
    title="EUGroups API",
    description="Collaborative Groups API - Teams, Chat, Kanban Boards",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Configuration
# Allow both local development and production origins
CORS_ORIGINS = [
    # Local development
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    # Production - Kubernetes NodePorts
    "http://192.168.124.50:30083",  # EUGroups frontend
    "http://192.168.124.50:30080",  # Dashboard
    "http://192.168.124.50:30081",  # Login
    "http://192.168.124.50:30082",  # EUMail
    "http://192.168.124.50:30084",  # EUCloud
    "http://192.168.124.50:30085",  # EUType
    # Allow any subdomain of eusuite if needed
    "https://eugroups.eusuite.local",
    "https://dashboard.eusuite.local",
]

# Add any additional origins from environment
extra_origins = os.getenv("EXTRA_CORS_ORIGINS", "").split(",")
CORS_ORIGINS.extend([o.strip() for o in extra_origins if o.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(groups.router, prefix="/api")
app.include_router(channels.router, prefix="/api")
app.include_router(boards.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(dm.router, prefix="/api")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "EUGroups",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/api/health")
async def health_check():
    """Health check endpoint for Kubernetes"""
    return {"status": "healthy", "service": "eugroups-backend"}


@app.get("/api/unread")
async def get_unread_count():
    """Get total unread count for dashboard badge (placeholder)"""
    # TODO: Implement proper unread tracking across all user's channels
    return {"total_unread": 0}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
