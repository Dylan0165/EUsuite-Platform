"""
Users Router - Search users across EUsuite
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional
import logging

from models import get_db, User
from auth import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/api/users/search")
async def search_users(
    q: str = Query(..., min_length=1, description="Search query (username/email)"),
    limit: int = Query(20, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Search for users by email.
    Returns matching users excluding the current user.
    """
    search_term = f"%{q.lower()}%"
    
    # current_user is a User object, get user_id directly
    current_user_id = current_user.user_id
    
    logger.info(f"User search: query='{q}', current_user_id={current_user_id}")
    
    # Search users by email (case insensitive), exclude self
    users = db.query(User).filter(
        User.email.ilike(search_term),
        User.user_id != current_user_id
    ).limit(limit).all()
    
    logger.info(f"Found {len(users)} users matching '{q}'")
    
    # Format response
    result = []
    for user in users:
        # Create a username from email (part before @)
        email = user.email or ""
        username = email.split("@")[0] if "@" in email else email
        
        # Generate avatar color from user_id
        avatar_color = f"#{str(user.user_id).zfill(6)[-6:]}"
        if not avatar_color[1:].isalnum():
            avatar_color = "#3B82F6"  # Default blue
        
        result.append({
            "user_id": str(user.user_id),
            "email": user.email,
            "username": username,
            "avatar_color": avatar_color
        })
    
    logger.info(f"User search for '{q}' returned {len(result)} results")
    return {"users": result}


@router.get("/api/users/{user_id}")
async def get_user_by_id(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific user by ID.
    """
    user = db.query(User).filter(User.user_id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    email = user.email or ""
    username = email.split("@")[0] if "@" in email else email
    
    return {
        "user_id": str(user.user_id),
        "email": user.email,
        "username": username
    }


@router.get("/api/users")
async def list_users(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List all users (for admin/contact purposes).
    Excludes sensitive information.
    """
    current_user_id = current_user.user_id
    
    users = db.query(User).filter(
        User.user_id != current_user_id
    ).offset(offset).limit(limit).all()
    
    result = []
    for user in users:
        email = user.email or ""
        username = email.split("@")[0] if "@" in email else email
        
        result.append({
            "user_id": str(user.user_id),
            "email": user.email,
            "username": username
        })
    
    total = db.query(User).count() - 1  # Minus self
    
    return {
        "users": result,
        "total": total,
        "limit": limit,
        "offset": offset
    }
