"""
EUMail Router - Mail API endpoints
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app.models import MailMessage
from app.schemas import (
    MailMessageCreate,
    MailMessageResponse,
    MailMessagePreview,
    MailInboxResponse,
    MailSentResponse,
    UnreadCountResponse,
    MessageSentResponse
)
from app.utils.auth_client import get_current_user

router = APIRouter(prefix="/api/mail", tags=["mail"])


@router.get("/messages", response_model=MailInboxResponse)
async def get_inbox(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Get inbox messages for the current user"""
    user = await get_current_user(request)
    user_email = user["email"]
    
    # Get messages where user is recipient
    query = db.query(MailMessage).filter(
        MailMessage.recipient_email == user_email
    ).order_by(MailMessage.created_at.desc())
    
    total = query.count()
    unread = query.filter(MailMessage.is_read == False).count()
    messages = query.offset(skip).limit(limit).all()
    
    return MailInboxResponse(
        messages=[MailMessagePreview(
            id=m.id,
            sender_email=m.sender_email,
            sender_username=m.sender_username,
            subject=m.subject,
            created_at=m.created_at,
            is_read=m.is_read
        ) for m in messages],
        total=total,
        unread=unread
    )


@router.get("/sent", response_model=MailSentResponse)
async def get_sent(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Get sent messages for the current user"""
    user = await get_current_user(request)
    user_email = user["email"]
    
    # Get messages where user is sender
    query = db.query(MailMessage).filter(
        MailMessage.sender_email == user_email
    ).order_by(MailMessage.created_at.desc())
    
    total = query.count()
    messages = query.offset(skip).limit(limit).all()
    
    return MailSentResponse(
        messages=[MailMessagePreview(
            id=m.id,
            sender_email=m.recipient_email,  # Show recipient in sent view
            sender_username=None,
            subject=m.subject,
            created_at=m.created_at,
            is_read=m.is_read
        ) for m in messages],
        total=total
    )


@router.get("/unread-count", response_model=UnreadCountResponse)
async def get_unread_count(
    request: Request,
    db: Session = Depends(get_db)
):
    """Get unread message count for the current user"""
    user = await get_current_user(request)
    user_email = user["email"]
    
    count = db.query(MailMessage).filter(
        MailMessage.recipient_email == user_email,
        MailMessage.is_read == False
    ).count()
    
    return UnreadCountResponse(count=count)


@router.get("/messages/{message_id}", response_model=MailMessageResponse)
async def get_message(
    message_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    """Get a specific message by ID"""
    user = await get_current_user(request)
    user_email = user["email"]
    
    message = db.query(MailMessage).filter(
        MailMessage.id == message_id
    ).first()
    
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # User must be sender or recipient
    if message.sender_email != user_email and message.recipient_email != user_email:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return message


@router.post("/messages", response_model=MessageSentResponse)
async def send_message(
    mail_data: MailMessageCreate,
    request: Request,
    db: Session = Depends(get_db)
):
    """Send a new mail message"""
    user = await get_current_user(request)
    
    # Create the message
    message = MailMessage(
        sender_id=user["user_id"],
        sender_email=user["email"],
        sender_username=user.get("username"),
        recipient_id="",  # Will be populated if we can look up the user
        recipient_email=mail_data.recipient_email,
        subject=mail_data.subject,
        body=mail_data.body,
        is_read=False
    )
    
    db.add(message)
    db.commit()
    db.refresh(message)
    
    return MessageSentResponse(
        success=True,
        message="Mail sent successfully",
        mail_id=message.id
    )


@router.post("/messages/{message_id}/read")
async def mark_as_read(
    message_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    """Mark a message as read"""
    user = await get_current_user(request)
    user_email = user["email"]
    
    message = db.query(MailMessage).filter(
        MailMessage.id == message_id
    ).first()
    
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # Only recipient can mark as read
    if message.recipient_email != user_email:
        raise HTTPException(status_code=403, detail="Access denied")
    
    message.is_read = True
    db.commit()
    
    return {"success": True, "message": "Marked as read"}


@router.delete("/messages/{message_id}")
async def delete_message(
    message_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    """Delete a message"""
    user = await get_current_user(request)
    user_email = user["email"]
    
    message = db.query(MailMessage).filter(
        MailMessage.id == message_id
    ).first()
    
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # User must be sender or recipient to delete
    if message.sender_email != user_email and message.recipient_email != user_email:
        raise HTTPException(status_code=403, detail="Access denied")
    
    db.delete(message)
    db.commit()
    
    return {"success": True, "message": "Message deleted"}
