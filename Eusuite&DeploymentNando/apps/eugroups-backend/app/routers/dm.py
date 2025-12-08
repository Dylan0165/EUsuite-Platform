"""
Direct Messages Router - Private messaging between users
"""
from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc

from ..database import get_db
from ..models import Conversation, ConversationParticipant, DirectMessage, Contact
from ..utils.auth_client import get_current_user

router = APIRouter(prefix="/dm", tags=["Direct Messages"])


@router.get("/conversations")
async def list_conversations(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all conversations for the current user"""
    # Get conversations where user is a participant
    participations = db.query(ConversationParticipant).filter(
        ConversationParticipant.user_id == current_user["user_id"]
    ).all()
    
    conversation_ids = [p.conversation_id for p in participations]
    
    if not conversation_ids:
        return {"conversations": []}
    
    conversations = db.query(Conversation).filter(
        Conversation.id.in_(conversation_ids)
    ).order_by(desc(Conversation.updated_at)).all()
    
    result = []
    for conv in conversations:
        # Get other participants
        other_participants = [
            p for p in conv.participants 
            if p.user_id != current_user["user_id"]
        ]
        
        # Get last message
        last_message = db.query(DirectMessage).filter(
            DirectMessage.conversation_id == conv.id
        ).order_by(desc(DirectMessage.created_at)).first()
        
        # Get unread count
        my_participation = next(
            (p for p in conv.participants if p.user_id == current_user["user_id"]), 
            None
        )
        unread_count = 0
        if my_participation and my_participation.last_read_at:
            unread_count = db.query(DirectMessage).filter(
                DirectMessage.conversation_id == conv.id,
                DirectMessage.sender_id != current_user["user_id"],
                DirectMessage.created_at > my_participation.last_read_at
            ).count()
        elif my_participation:
            unread_count = db.query(DirectMessage).filter(
                DirectMessage.conversation_id == conv.id,
                DirectMessage.sender_id != current_user["user_id"]
            ).count()
        
        result.append({
            "id": conv.id,
            "participants": [
                {
                    "user_id": p.user_id,
                    "email": p.user_email,
                    "name": p.user_name
                }
                for p in other_participants
            ],
            "last_message": {
                "content": last_message.content if last_message else None,
                "sender_id": last_message.sender_id if last_message else None,
                "sender_name": last_message.sender_name if last_message else None,
                "created_at": last_message.created_at.isoformat() if last_message else None,
                "type": last_message.message_type if last_message else None
            } if last_message else None,
            "unread_count": unread_count,
            "updated_at": conv.updated_at.isoformat()
        })
    
    return {"conversations": result}


@router.post("/conversations")
async def create_or_get_conversation(
    participant_user_id: str,
    participant_email: Optional[str] = None,
    participant_name: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new conversation or get existing one with a user"""
    if participant_user_id == current_user["user_id"]:
        raise HTTPException(status_code=400, detail="Cannot start conversation with yourself")
    
    # Check if blocked
    blocked = db.query(Contact).filter(
        Contact.user_id == current_user["user_id"],
        Contact.contact_user_id == participant_user_id,
        Contact.is_blocked == True
    ).first()
    
    if blocked:
        raise HTTPException(status_code=400, detail="Cannot message blocked user")
    
    # Check if conversation already exists between these two users
    my_convs = db.query(ConversationParticipant.conversation_id).filter(
        ConversationParticipant.user_id == current_user["user_id"]
    ).subquery()
    
    existing_participant = db.query(ConversationParticipant).filter(
        ConversationParticipant.user_id == participant_user_id,
        ConversationParticipant.conversation_id.in_(my_convs)
    ).first()
    
    if existing_participant:
        # Check if it's a 1-on-1 conversation (only 2 participants)
        conv = db.query(Conversation).filter(
            Conversation.id == existing_participant.conversation_id
        ).first()
        
        participant_count = db.query(ConversationParticipant).filter(
            ConversationParticipant.conversation_id == conv.id
        ).count()
        
        if participant_count == 2:
            # Return existing conversation
            other = db.query(ConversationParticipant).filter(
                ConversationParticipant.conversation_id == conv.id,
                ConversationParticipant.user_id != current_user["user_id"]
            ).first()
            
            return {
                "id": conv.id,
                "is_new": False,
                "participant": {
                    "user_id": other.user_id,
                    "email": other.user_email,
                    "name": other.user_name
                }
            }
    
    # Create new conversation
    conversation = Conversation()
    db.add(conversation)
    db.flush()
    
    # Add participants
    me = ConversationParticipant(
        conversation_id=conversation.id,
        user_id=current_user["user_id"],
        user_email=current_user.get("email"),
        user_name=current_user.get("username")
    )
    other = ConversationParticipant(
        conversation_id=conversation.id,
        user_id=participant_user_id,
        user_email=participant_email,
        user_name=participant_name
    )
    db.add(me)
    db.add(other)
    db.commit()
    db.refresh(conversation)
    
    return {
        "id": conversation.id,
        "is_new": True,
        "participant": {
            "user_id": participant_user_id,
            "email": participant_email,
            "name": participant_name
        }
    }


@router.get("/conversations/{conversation_id}")
async def get_conversation(
    conversation_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific conversation"""
    # Verify user is participant
    participation = db.query(ConversationParticipant).filter(
        ConversationParticipant.conversation_id == conversation_id,
        ConversationParticipant.user_id == current_user["user_id"]
    ).first()
    
    if not participation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id
    ).first()
    
    other_participants = [
        {
            "user_id": p.user_id,
            "email": p.user_email,
            "name": p.user_name
        }
        for p in conversation.participants
        if p.user_id != current_user["user_id"]
    ]
    
    return {
        "id": conversation.id,
        "participants": other_participants,
        "created_at": conversation.created_at.isoformat(),
        "updated_at": conversation.updated_at.isoformat()
    }


@router.get("/conversations/{conversation_id}/messages")
async def get_messages(
    conversation_id: int,
    limit: int = Query(50, ge=1, le=100),
    before_id: Optional[int] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get messages in a conversation"""
    # Verify user is participant
    participation = db.query(ConversationParticipant).filter(
        ConversationParticipant.conversation_id == conversation_id,
        ConversationParticipant.user_id == current_user["user_id"]
    ).first()
    
    if not participation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    query = db.query(DirectMessage).filter(
        DirectMessage.conversation_id == conversation_id
    )
    
    if before_id:
        query = query.filter(DirectMessage.id < before_id)
    
    messages = query.order_by(desc(DirectMessage.created_at)).limit(limit).all()
    
    # Mark as read
    participation.last_read_at = datetime.utcnow()
    db.commit()
    
    return {
        "messages": [
            {
                "id": m.id,
                "sender_id": m.sender_id,
                "sender_email": m.sender_email,
                "sender_name": m.sender_name,
                "content": m.content,
                "created_at": m.created_at.isoformat(),
                "type": m.message_type
            }
            for m in reversed(messages)
        ]
    }


@router.post("/conversations/{conversation_id}/messages")
async def send_message(
    conversation_id: int,
    content: str,
    message_type: str = "text",
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send a message in a conversation"""
    # Verify user is participant
    participation = db.query(ConversationParticipant).filter(
        ConversationParticipant.conversation_id == conversation_id,
        ConversationParticipant.user_id == current_user["user_id"]
    ).first()
    
    if not participation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Create message
    message = DirectMessage(
        conversation_id=conversation_id,
        sender_id=current_user["user_id"],
        sender_email=current_user.get("email"),
        sender_name=current_user.get("username"),
        content=content,
        message_type=message_type
    )
    db.add(message)
    
    # Update conversation timestamp
    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id
    ).first()
    conversation.updated_at = datetime.utcnow()
    
    # Update sender's last read
    participation.last_read_at = datetime.utcnow()
    
    db.commit()
    db.refresh(message)
    
    return {
        "id": message.id,
        "sender_id": message.sender_id,
        "sender_email": message.sender_email,
        "sender_name": message.sender_name,
        "content": message.content,
        "created_at": message.created_at.isoformat(),
        "type": message.message_type
    }


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a conversation (removes your participation)"""
    participation = db.query(ConversationParticipant).filter(
        ConversationParticipant.conversation_id == conversation_id,
        ConversationParticipant.user_id == current_user["user_id"]
    ).first()
    
    if not participation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Remove user from conversation
    db.delete(participation)
    
    # If no participants left, delete conversation
    remaining = db.query(ConversationParticipant).filter(
        ConversationParticipant.conversation_id == conversation_id
    ).count()
    
    if remaining == 0:
        conversation = db.query(Conversation).filter(
            Conversation.id == conversation_id
        ).first()
        if conversation:
            db.delete(conversation)
    
    db.commit()
    
    return {"message": "Conversation deleted"}


@router.get("/unread")
async def get_unread_count(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get total unread DM count"""
    participations = db.query(ConversationParticipant).filter(
        ConversationParticipant.user_id == current_user["user_id"]
    ).all()
    
    total_unread = 0
    for p in participations:
        if p.last_read_at:
            count = db.query(DirectMessage).filter(
                DirectMessage.conversation_id == p.conversation_id,
                DirectMessage.sender_id != current_user["user_id"],
                DirectMessage.created_at > p.last_read_at
            ).count()
        else:
            count = db.query(DirectMessage).filter(
                DirectMessage.conversation_id == p.conversation_id,
                DirectMessage.sender_id != current_user["user_id"]
            ).count()
        total_unread += count
    
    return {"total_unread": total_unread}
