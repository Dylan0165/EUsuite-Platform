"""
EUMail Pydantic Schemas
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr


class UserInfo(BaseModel):
    """User info from SSO validation"""
    user_id: str
    email: str
    username: Optional[str] = None


class MailMessageCreate(BaseModel):
    """Schema for creating a new mail message"""
    recipient_email: str
    subject: str
    body: str


class MailMessageResponse(BaseModel):
    """Schema for mail message response"""
    id: int
    sender_id: str
    sender_email: str
    sender_username: Optional[str]
    recipient_id: str
    recipient_email: str
    subject: str
    body: str
    created_at: datetime
    is_read: bool

    class Config:
        from_attributes = True


class MailMessagePreview(BaseModel):
    """Schema for mail message preview (list view)"""
    id: int
    sender_email: str
    sender_username: Optional[str]
    subject: str
    created_at: datetime
    is_read: bool

    class Config:
        from_attributes = True


class MailInboxResponse(BaseModel):
    """Schema for inbox response"""
    messages: List[MailMessagePreview]
    total: int
    unread: int


class MailSentResponse(BaseModel):
    """Schema for sent mail response"""
    messages: List[MailMessagePreview]
    total: int


class UnreadCountResponse(BaseModel):
    """Schema for unread count response"""
    count: int


class MessageSentResponse(BaseModel):
    """Response after sending a message"""
    success: bool
    message: str
    mail_id: int
