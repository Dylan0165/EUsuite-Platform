"""
EUMail Backend - FastAPI Application
Email service for EUSuite platform
"""
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.routers import mail


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup: Initialize database
    print("🚀 EUMail Backend starting...")
    init_db()
    print("✅ Database initialized")
    yield
    # Shutdown
    print("👋 EUMail Backend shutting down...")


app = FastAPI(
    title="EUMail API",
    description="Email service for EUSuite platform",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration for SSO cookie support
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "").split(",") if os.getenv("ALLOWED_ORIGINS") else [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://192.168.124.50:30082",
    "http://192.168.124.50:30090",
    "http://192.168.124.50:30091",
    "http://192.168.124.50:30080",
    "http://192.168.124.50:30081",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
)

# Include routers
app.include_router(mail.router)


@app.get("/health")
async def health_check():
    """Health check endpoint for Kubernetes"""
    return {
        "status": "healthy",
        "service": "eumail-backend",
        "version": "1.0.0"
    }


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "EUMail API",
        "version": "1.0.0",
        "docs": "/docs"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
