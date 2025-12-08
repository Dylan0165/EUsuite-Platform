"""
Channels Router - CRUD for channels and messages with WebSocket support
"""
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..database import get_db
from ..models import Group, GroupMember, Channel, Message
from ..schemas import (
    ChannelCreate, ChannelResponse, ChannelListResponse,
    MessageCreate, MessageResponse, MessageListResponse
)
from ..utils.auth_client import get_current_user
from ..utils.websocket_manager import manager

router = APIRouter(tags=["Channels"])


def check_group_membership(db: Session, group_id: int, user_id: str) -> GroupMember:
    """Check if user is a member of the group"""
    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == user_id
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="Must be a group member")
    return member


# ============ Channel CRUD ============

@router.get("/groups/{group_id}/channels", response_model=ChannelListResponse)
async def list_channels(
    group_id: int,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all channels in a group"""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    check_group_membership(db, group_id, user["user_id"])
    
    channels = db.query(Channel).filter(Channel.group_id == group_id).order_by(Channel.created_at).all()
    
    # Add unread counts
    result = []
    for channel in channels:
        unread = db.query(func.count(Message.id)).filter(
            Message.channel_id == channel.id,
            Message.sender_id != user["user_id"],
            Message.is_read == False
        ).scalar()
        
        channel_dict = {
            "id": channel.id,
            "group_id": channel.group_id,
            "name": channel.name,
            "description": channel.description,
            "is_default": channel.is_default,
            "created_at": channel.created_at,
            "unread_count": unread
        }
        result.append(ChannelResponse(**channel_dict))
    
    return ChannelListResponse(channels=result, total=len(result))


@router.post("/groups/{group_id}/channels", response_model=ChannelResponse, status_code=201)
async def create_channel(
    group_id: int,
    channel_data: ChannelCreate,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new channel in a group"""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    membership = check_group_membership(db, group_id, user["user_id"])
    
    # Only admins can create channels
    if membership.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can create channels")
    
    # Check for duplicate name
    existing = db.query(Channel).filter(
        Channel.group_id == group_id,
        Channel.name == channel_data.name
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Channel name already exists")
    
    channel = Channel(
        group_id=group_id,
        name=channel_data.name,
        description=channel_data.description,
        is_default=False
    )
    db.add(channel)
    db.commit()
    db.refresh(channel)
    
    return ChannelResponse(
        id=channel.id,
        group_id=channel.group_id,
        name=channel.name,
        description=channel.description,
        is_default=channel.is_default,
        created_at=channel.created_at,
        unread_count=0
    )


@router.delete("/channels/{channel_id}", status_code=204)
async def delete_channel(
    channel_id: int,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a channel (admin only, can't delete default channel)"""
    channel = db.query(Channel).filter(Channel.id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    
    if channel.is_default:
        raise HTTPException(status_code=400, detail="Cannot delete the default channel")
    
    membership = check_group_membership(db, channel.group_id, user["user_id"])
    if membership.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can delete channels")
    
    db.delete(channel)
    db.commit()


# ============ Messages ============

@router.get("/channels/{channel_id}/messages", response_model=MessageListResponse)
async def list_messages(
    channel_id: int,
    before_id: Optional[int] = Query(None, description="Get messages before this ID"),
    limit: int = Query(50, ge=1, le=100),
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get messages from a channel with pagination"""
    channel = db.query(Channel).filter(Channel.id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    
    check_group_membership(db, channel.group_id, user["user_id"])
    
    query = db.query(Message).filter(Message.channel_id == channel_id)
    
    if before_id:
        query = query.filter(Message.id < before_id)
    
    total = query.count()
    messages = query.order_by(Message.created_at.desc()).limit(limit + 1).all()
    
    has_more = len(messages) > limit
    messages = messages[:limit]
    messages.reverse()  # Return in chronological order
    
    # Mark messages as read
    db.query(Message).filter(
        Message.channel_id == channel_id,
        Message.sender_id != user["user_id"],
        Message.is_read == False
    ).update({"is_read": True})
    db.commit()
    
    return MessageListResponse(
        messages=[MessageResponse.model_validate(m) for m in messages],
        total=total,
        has_more=has_more
    )


@router.post("/channels/{channel_id}/messages", response_model=MessageResponse, status_code=201)
async def create_message(
    channel_id: int,
    message_data: MessageCreate,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send a message to a channel"""
    channel = db.query(Channel).filter(Channel.id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    
    check_group_membership(db, channel.group_id, user["user_id"])
    
    message = Message(
        channel_id=channel_id,
        sender_id=user["user_id"],
        sender_email=user.get("email"),
        sender_name=user.get("username"),
        content=message_data.content
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    
    # Broadcast to WebSocket clients
    message_response = MessageResponse.model_validate(message)
    await manager.broadcast_to_channel(channel_id, {
        "type": "new_message",
        "message": message_response.model_dump(mode="json")
    })
    
    return message_response


# ============ WebSocket ============

@router.websocket("/ws/channels/{channel_id}")
async def channel_websocket(
    websocket: WebSocket,
    channel_id: int,
    db: Session = Depends(get_db)
):
    """WebSocket endpoint for real-time channel chat"""
    # Get token from query params or cookies
    token = websocket.query_params.get("token") or websocket.cookies.get("eusuite_token")
    
    if not token:
        await websocket.close(code=4001, reason="No authentication token")
        return
    
    # Validate user via SSO
    try:
        # Create a mock request to use auth_client
        import httpx
        import os
        
        validate_url = os.getenv("CORE_VALIDATE_URL", "http://eucloud-backend/api/auth/validate")
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(validate_url, cookies={"eusuite_token": token})
            
            if response.status_code != 200:
                await websocket.close(code=4001, reason="Invalid token")
                return
            
            data = response.json()
            if not data.get("valid"):
                await websocket.close(code=4001, reason="Session invalid")
                return
            
            user_data = data.get("user", data)
            user = {
                "user_id": str(user_data.get("user_id") or user_data.get("id") or data.get("user_id")),
                "email": user_data.get("email") or data.get("email"),
                "username": user_data.get("username") or data.get("username")
            }
    except Exception as e:
        await websocket.close(code=4003, reason=f"Auth error: {str(e)}")
        return
    
    # Verify channel exists and user has access
    channel = db.query(Channel).filter(Channel.id == channel_id).first()
    if not channel:
        await websocket.close(code=4004, reason="Channel not found")
        return
    
    membership = db.query(GroupMember).filter(
        GroupMember.group_id == channel.group_id,
        GroupMember.user_id == user["user_id"]
    ).first()
    
    if not membership:
        await websocket.close(code=4003, reason="Not a member of this group")
        return
    
    # Connect to channel
    await manager.connect(websocket, channel_id, user)
    
    try:
        while True:
            data = await websocket.receive_json()
            
            if data.get("type") == "typing":
                # Broadcast typing indicator
                await manager.broadcast_to_channel(channel_id, {
                    "type": "typing",
                    "user_id": user["user_id"],
                    "username": user.get("username"),
                    "is_typing": data.get("is_typing", True)
                }, exclude=websocket)
            
            elif data.get("type") == "message":
                # Handle message via REST API instead for persistence
                pass
            
            elif data.get("type") == "ping":
                await manager.send_personal_message(websocket, {"type": "pong"})
    
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        await manager.broadcast_to_channel(channel_id, {
            "type": "user_left",
            "user_id": user["user_id"],
            "username": user.get("username")
        })
    except Exception as e:
        manager.disconnect(websocket)
