"""
EUAdmin Backend - Pydantic schemas
Request and response models for the admin API.
"""
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime


# ============ Auth Schemas ============

class AdminLoginRequest(BaseModel):
    """Admin login request."""
    email: EmailStr
    password: str


class AdminLoginResponse(BaseModel):
    """Admin login response with token."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    admin_email: str


class TokenValidateResponse(BaseModel):
    """Token validation response."""
    valid: bool
    email: Optional[str] = None
    expires_at: Optional[str] = None


# ============ User Schemas ============

class UserInfo(BaseModel):
    """Basic user information with storage stats."""
    id: int
    user_id: str
    username: str
    email: Optional[str]
    avatar_color: Optional[str]
    is_active: bool
    storage_quota: Optional[int] = None
    storage_used: Optional[int] = None
    storage_quota_gb: Optional[float] = None
    storage_used_gb: Optional[float] = None
    file_count: Optional[int] = None
    actual_storage: Optional[int] = None
    actual_storage_mb: Optional[float] = None
    created_at: Optional[str]
    last_login: Optional[str]


class UserListResponse(BaseModel):
    """List of users response."""
    users: List[UserInfo]
    total: int


class UserStorageInfo(BaseModel):
    """User storage information."""
    user_id: str
    total_files: int
    total_bytes: int
    total_mb: float
    total_gb: float
    storage_by_type: Dict[str, Any]


class UserActivity(BaseModel):
    """User activity item."""
    action: str
    detail: str
    timestamp: Optional[str]
    metadata: Optional[Dict[str, Any]]


class UserActivityResponse(BaseModel):
    """User activity response."""
    user_id: str
    activities: List[UserActivity]


class UserUsageInfo(BaseModel):
    """User resource usage info."""
    user_id: str
    cpu_millicores: int
    memory_mb: float
    pod_name: Optional[str]
    pod_restarts: int


# ============ System Schemas ============

class SystemStats(BaseModel):
    """Overall system statistics."""
    total_users: int
    active_users_24h: int
    total_storage: Dict[str, Any]


class PodInfo(BaseModel):
    """Kubernetes pod information."""
    name: str
    status: str
    ready: bool
    restarts: int
    created: Optional[str]
    app: str
    node: Optional[str]


class PodMetrics(BaseModel):
    """Pod resource metrics."""
    name: str
    cpu_millicores: int
    memory_mb: float
    timestamp: str


class DeploymentInfo(BaseModel):
    """Kubernetes deployment information."""
    name: str
    replicas: int
    ready_replicas: int
    available_replicas: int
    updated_replicas: int
    created: Optional[str]


class SystemUsageResponse(BaseModel):
    """System resource usage response."""
    pods: List[PodMetrics]
    nodes: List[Dict[str, Any]]
    total_cpu_millicores: int
    total_memory_mb: float


class SystemStorageResponse(BaseModel):
    """System storage response."""
    total_storage: Dict[str, Any]
    persistent_volumes: List[Dict[str, Any]]


class LogEntry(BaseModel):
    """Log entry."""
    timestamp: str
    pod: str
    message: str


class SystemLogsResponse(BaseModel):
    """System logs response."""
    logs: List[LogEntry]


# ============ Action Response Schemas ============

class ActionResponse(BaseModel):
    """Generic action response."""
    success: bool
    message: str
    details: Optional[Dict[str, Any]] = None
