"""
Users Router - Search users, manage contacts
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
import httpx
import os

from ..database import get_db
from ..models import Contact, GroupMember, Group
from ..utils.auth_client import get_current_user

router = APIRouter(prefix="/users", tags=["Users"])

# Core backend URL for user search
CORE_BACKEND_URL = os.getenv("CORE_BACKEND_URL", "http://eucloud-backend")


@router.get("/search")
async def search_users(
    request: Request,
    q: str = Query(..., min_length=1, description="Search query (username or email)"),
    limit: int = Query(20, ge=1, le=50),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Search for users by username or email.
    This calls the core backend's user search endpoint.
    """
    # Get token from request cookies
    token = request.cookies.get("eusuite_token", "")
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{CORE_BACKEND_URL}/api/users/search",
                params={"q": q, "limit": limit},
                cookies={"eusuite_token": token}
            )
            
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 404:
                # Endpoint doesn't exist yet, return empty
                return {"users": [], "message": "User search not available"}
            else:
                return {"users": [], "message": "Search temporarily unavailable"}
    except Exception as e:
        # If core backend is not reachable, search locally in group members
        # This provides a fallback
        return await search_local_users(q, limit, current_user, db)


async def search_local_users(
    q: str,
    limit: int,
    current_user: dict,
    db: Session
):
    """
    Fallback: Search users from local group member data
    """
    search_term = f"%{q.lower()}%"
    
    # Get unique users from group members
    members = db.query(GroupMember).filter(
        (GroupMember.user_email.ilike(search_term)) |
        (GroupMember.user_name.ilike(search_term))
    ).limit(limit * 2).all()
    
    # Deduplicate by user_id
    seen = set()
    users = []
    for member in members:
        if member.user_id not in seen and member.user_id != current_user["user_id"]:
            seen.add(member.user_id)
            users.append({
                "user_id": member.user_id,
                "email": member.user_email,
                "username": member.user_name or member.user_email.split("@")[0] if member.user_email else "Unknown",
                "avatar_color": "#" + member.user_id[:6] if len(member.user_id) >= 6 else "#3B82F6"
            })
            if len(users) >= limit:
                break
    
    return {"users": users, "source": "local"}


@router.get("/groups/search")
async def search_groups(
    q: str = Query(..., min_length=1, description="Search query"),
    limit: int = Query(20, ge=1, le=50),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Search for public groups by name
    """
    search_term = f"%{q.lower()}%"
    
    groups = db.query(Group).filter(
        Group.name.ilike(search_term)
    ).limit(limit).all()
    
    # Check membership for each group
    result = []
    for group in groups:
        is_member = db.query(GroupMember).filter(
            GroupMember.group_id == group.id,
            GroupMember.user_id == current_user["user_id"]
        ).first() is not None
        
        member_count = db.query(GroupMember).filter(
            GroupMember.group_id == group.id
        ).count()
        
        result.append({
            "id": group.id,
            "name": group.name,
            "description": group.description,
            "avatar_color": group.avatar_color,
            "member_count": member_count,
            "is_member": is_member,
            "owner_id": group.owner_id
        })
    
    return {"groups": result}


# ============ Contacts ============

@router.get("/contacts")
async def list_contacts(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all contacts for the current user"""
    contacts = db.query(Contact).filter(
        Contact.user_id == current_user["user_id"],
        Contact.is_blocked == False
    ).order_by(Contact.contact_name).all()
    
    return {
        "contacts": [
            {
                "id": c.id,
                "user_id": c.contact_user_id,
                "email": c.contact_email,
                "name": c.contact_name,
                "nickname": c.nickname,
                "created_at": c.created_at.isoformat()
            }
            for c in contacts
        ]
    }


@router.post("/contacts")
async def add_contact(
    contact_user_id: str,
    contact_email: Optional[str] = None,
    contact_name: Optional[str] = None,
    nickname: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a user as contact"""
    if contact_user_id == current_user["user_id"]:
        raise HTTPException(status_code=400, detail="Cannot add yourself as contact")
    
    # Check if already a contact
    existing = db.query(Contact).filter(
        Contact.user_id == current_user["user_id"],
        Contact.contact_user_id == contact_user_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Already in contacts")
    
    contact = Contact(
        user_id=current_user["user_id"],
        contact_user_id=contact_user_id,
        contact_email=contact_email,
        contact_name=contact_name,
        nickname=nickname
    )
    db.add(contact)
    db.commit()
    db.refresh(contact)
    
    return {
        "id": contact.id,
        "user_id": contact.contact_user_id,
        "email": contact.contact_email,
        "name": contact.contact_name,
        "nickname": contact.nickname,
        "created_at": contact.created_at.isoformat()
    }


@router.delete("/contacts/{contact_id}")
async def remove_contact(
    contact_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove a contact"""
    contact = db.query(Contact).filter(
        Contact.id == contact_id,
        Contact.user_id == current_user["user_id"]
    ).first()
    
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    db.delete(contact)
    db.commit()
    
    return {"message": "Contact removed"}


@router.post("/contacts/{contact_id}/block")
async def block_contact(
    contact_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Block a contact"""
    contact = db.query(Contact).filter(
        Contact.id == contact_id,
        Contact.user_id == current_user["user_id"]
    ).first()
    
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    contact.is_blocked = True
    db.commit()
    
    return {"message": "Contact blocked"}


@router.get("/blocked")
async def list_blocked(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get blocked users"""
    blocked = db.query(Contact).filter(
        Contact.user_id == current_user["user_id"],
        Contact.is_blocked == True
    ).all()
    
    return {
        "blocked": [
            {
                "id": c.id,
                "user_id": c.contact_user_id,
                "email": c.contact_email,
                "name": c.contact_name
            }
            for c in blocked
        ]
    }
