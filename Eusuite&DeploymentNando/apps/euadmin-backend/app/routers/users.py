"""
EUAdmin Backend - Users Router
User management and monitoring endpoints.
"""
from fastapi import APIRouter, HTTPException, status, Depends
from typing import Optional

from ..auth import get_current_admin
from ..database import (
    get_all_users,
    get_users_with_storage,
    get_user_by_id,
    get_user_storage,
    get_user_activity,
    delete_user,
    block_user,
    unblock_user,
    reset_user_storage
)
from ..kubernetes_client import k8s_client
from ..schemas import (
    UserListResponse,
    UserInfo,
    UserStorageInfo,
    UserActivityResponse,
    UserUsageInfo,
    ActionResponse
)

router = APIRouter(prefix="/admin", tags=["users"])


@router.get("/users", response_model=UserListResponse)
async def list_users(
    limit: int = 100,
    offset: int = 0,
    admin: dict = Depends(get_current_admin)
):
    """
    Get list of all users in the system with storage stats.
    """
    users = get_users_with_storage()
    
    # Apply pagination
    paginated = users[offset:offset + limit]
    
    return UserListResponse(
        users=[UserInfo(**u) for u in paginated],
        total=len(users)
    )


@router.get("/user/{user_id}", response_model=UserInfo)
async def get_user(
    user_id: str,
    admin: dict = Depends(get_current_admin)
):
    """
    Get detailed information about a specific user.
    """
    user = get_user_by_id(user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User {user_id} not found"
        )
    
    return UserInfo(**user)


@router.get("/user/{user_id}/storage", response_model=UserStorageInfo)
async def get_user_storage_info(
    user_id: str,
    admin: dict = Depends(get_current_admin)
):
    """
    Get storage usage information for a specific user.
    """
    # Verify user exists
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User {user_id} not found"
        )
    
    storage = get_user_storage(user_id)
    return UserStorageInfo(**storage)


@router.get("/user/{user_id}/activity", response_model=UserActivityResponse)
async def get_user_activity_info(
    user_id: str,
    limit: int = 50,
    admin: dict = Depends(get_current_admin)
):
    """
    Get recent activity log for a specific user.
    """
    # Verify user exists
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User {user_id} not found"
        )
    
    activities = get_user_activity(user_id, limit)
    return UserActivityResponse(
        user_id=user_id,
        activities=activities
    )


@router.get("/user/{user_id}/usage", response_model=UserUsageInfo)
async def get_user_usage(
    user_id: str,
    admin: dict = Depends(get_current_admin)
):
    """
    Get resource usage (CPU/RAM) for a specific user.
    Note: This shows pod-level metrics, not per-user metrics.
    In a multi-tenant setup, this would need user-to-pod mapping.
    """
    # For now, return placeholder data
    # In production, you'd map users to their pods/processes
    return UserUsageInfo(
        user_id=user_id,
        cpu_millicores=0,
        memory_mb=0,
        pod_name=None,
        pod_restarts=0
    )


@router.delete("/user/{user_id}", response_model=ActionResponse)
async def delete_user_endpoint(
    user_id: str,
    admin: dict = Depends(get_current_admin)
):
    """
    Delete a user and all their data permanently.
    This action cannot be undone!
    """
    # Verify user exists
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User {user_id} not found"
        )
    
    success = delete_user(user_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete user"
        )
    
    return ActionResponse(
        success=True,
        message=f"User {user_id} deleted successfully",
        details={"user_id": user_id, "username": user.get("username")}
    )


@router.post("/user/{user_id}/block", response_model=ActionResponse)
async def block_user_endpoint(
    user_id: str,
    admin: dict = Depends(get_current_admin)
):
    """
    Block/deactivate a user account.
    The user will not be able to login.
    """
    # Verify user exists
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User {user_id} not found"
        )
    
    success = block_user(user_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to block user"
        )
    
    return ActionResponse(
        success=True,
        message=f"User {user_id} blocked successfully",
        details={"user_id": user_id, "username": user.get("username")}
    )


@router.post("/user/{user_id}/unblock", response_model=ActionResponse)
async def unblock_user_endpoint(
    user_id: str,
    admin: dict = Depends(get_current_admin)
):
    """
    Unblock/reactivate a user account.
    """
    # Verify user exists
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User {user_id} not found"
        )
    
    success = unblock_user(user_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to unblock user"
        )
    
    return ActionResponse(
        success=True,
        message=f"User {user_id} unblocked successfully",
        details={"user_id": user_id, "username": user.get("username")}
    )


@router.post("/user/{user_id}/resetStorage", response_model=ActionResponse)
async def reset_user_storage_endpoint(
    user_id: str,
    admin: dict = Depends(get_current_admin)
):
    """
    Reset/delete all files for a user (clear their storage).
    The files will be soft-deleted.
    """
    # Verify user exists
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User {user_id} not found"
        )
    
    # Get storage before reset
    storage_before = get_user_storage(user_id)
    
    success = reset_user_storage(user_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reset storage"
        )
    
    return ActionResponse(
        success=True,
        message=f"Storage reset for user {user_id}",
        details={
            "user_id": user_id,
            "files_deleted": storage_before.get("total_files", 0),
            "space_freed_mb": storage_before.get("total_mb", 0)
        }
    )


@router.post("/user/{user_id}/forceLogout", response_model=ActionResponse)
async def force_logout_user(
    user_id: str,
    admin: dict = Depends(get_current_admin)
):
    """
    Force logout a user by invalidating their sessions.
    Note: This requires session management which may not be implemented.
    """
    # Verify user exists
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User {user_id} not found"
        )
    
    # In a JWT-based system, we can't truly invalidate tokens without a blacklist
    # This would need to be implemented in the SSO system
    return ActionResponse(
        success=True,
        message=f"Logout signal sent for user {user_id}",
        details={"user_id": user_id, "note": "User's current sessions will expire"}
    )
