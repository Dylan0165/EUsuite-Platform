"""
EUAdmin Backend - Auth Router
Admin authentication endpoints.
"""
from fastapi import APIRouter, HTTPException, status, Depends
from datetime import datetime, timedelta

from ..auth import authenticate_admin, verify_admin_token, get_current_admin
from ..schemas import AdminLoginRequest, AdminLoginResponse, TokenValidateResponse
from ..config import get_settings

router = APIRouter(prefix="/admin", tags=["auth"])
settings = get_settings()


@router.post("/login", response_model=AdminLoginResponse)
async def admin_login(request: AdminLoginRequest):
    """
    Authenticate admin user and return JWT token.
    Only admin@test.nl can login (hardcoded for development).
    """
    token = authenticate_admin(request.email, request.password)
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin credentials"
        )
    
    return AdminLoginResponse(
        access_token=token,
        token_type="bearer",
        expires_in=settings.ADMIN_JWT_EXPIRE_HOURS * 3600,
        admin_email=request.email
    )


@router.get("/validate", response_model=TokenValidateResponse)
async def validate_token(admin: dict = Depends(get_current_admin)):
    """
    Validate the current admin token.
    Returns token validity and expiration.
    """
    return TokenValidateResponse(
        valid=True,
        email=admin.get("sub"),
        expires_at=datetime.fromtimestamp(admin.get("exp", 0)).isoformat()
    )


@router.post("/logout")
async def admin_logout(admin: dict = Depends(get_current_admin)):
    """
    Logout admin user.
    Note: JWT tokens are stateless, so logout just confirms the action.
    Client should remove the token from storage.
    """
    return {"message": "Logged out successfully", "email": admin.get("sub")}
