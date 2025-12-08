"""
SSO Auth Client for EUGroups
Validates user sessions via the core eucloud-backend
NOTE: Uses port 80 (default) as the K8s service exposes port 80
"""
import os
import httpx
from typing import Optional
from fastapi import Request, HTTPException

# IMPORTANT: eucloud-backend service runs on port 80 in K8s
CORE_VALIDATE_URL = os.getenv(
    "CORE_VALIDATE_URL", 
    "http://eucloud-backend/api/auth/validate"
)


async def get_current_user(request: Request) -> dict:
    """
    Validate SSO session by calling core backend.
    
    Reads eusuite_token cookie and forwards it to the core validate endpoint.
    Returns user info if valid, raises HTTPException if not.
    """
    # Get the SSO token from cookie
    token = request.cookies.get("eusuite_token")
    
    if not token:
        raise HTTPException(
            status_code=401,
            detail="Not authenticated - no SSO token found"
        )
    
    try:
        # Forward the cookie to core backend for validation
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                CORE_VALIDATE_URL,
                cookies={"eusuite_token": token}
            )
            
            if response.status_code == 200:
                data = response.json()
                # Handle different response formats
                if data.get("valid"):
                    user_data = data.get("user", data)
                    return {
                        "user_id": str(user_data.get("user_id") or user_data.get("id") or data.get("user_id")),
                        "email": user_data.get("email") or data.get("email"),
                        "username": user_data.get("username") or data.get("username")
                    }
                else:
                    raise HTTPException(
                        status_code=401,
                        detail="SSO session invalid"
                    )
            elif response.status_code == 401:
                raise HTTPException(
                    status_code=401,
                    detail="SSO session invalid or expired"
                )
            else:
                raise HTTPException(
                    status_code=502,
                    detail=f"Core backend validation failed: {response.status_code}"
                )
                
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=503,
            detail=f"Could not reach core backend for SSO validation: {str(e)}"
        )


async def get_user_by_email(email: str) -> Optional[dict]:
    """
    Look up a user by email via core backend.
    Returns user info if found, None if not.
    """
    lookup_url = os.getenv(
        "CORE_USER_LOOKUP_URL",
        "http://eucloud-backend/api/auth/user-by-email"
    )
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                lookup_url,
                params={"email": email}
            )
            
            if response.status_code == 200:
                return response.json()
            return None
            
    except httpx.RequestError:
        return None


async def validate_token(token: str) -> Optional[dict]:
    """
    Validate an SSO token directly (for WebSocket connections).
    Returns user info if valid, None if not.
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                CORE_VALIDATE_URL,
                cookies={"eusuite_token": token}
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("valid"):
                    user_data = data.get("user", data)
                    return {
                        "user_id": str(user_data.get("user_id") or user_data.get("id") or data.get("user_id")),
                        "email": user_data.get("email") or data.get("email"),
                        "username": user_data.get("username") or data.get("username"),
                        "token": token
                    }
            return None
            
    except httpx.RequestError:
        return None
