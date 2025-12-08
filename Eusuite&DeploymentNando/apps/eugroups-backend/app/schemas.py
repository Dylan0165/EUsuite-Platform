"""
Pydantic Schemas for EUGroups API
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


# ============ Group Schemas ============

class GroupCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    avatar_color: Optional[str] = "#3B82F6"


class GroupUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    avatar_color: Optional[str] = None


class GroupMemberResponse(BaseModel):
    id: int
    user_id: str
    user_email: Optional[str]
    user_name: Optional[str]
    role: str
    joined_at: datetime

    class Config:
        from_attributes = True


class GroupResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    owner_id: str
    avatar_color: str
    created_at: datetime
    member_count: Optional[int] = 0
    channel_count: Optional[int] = 0

    class Config:
        from_attributes = True


class GroupDetailResponse(GroupResponse):
    members: List[GroupMemberResponse] = []
    is_member: bool = False
    user_role: Optional[str] = None


class GroupListResponse(BaseModel):
    groups: List[GroupResponse]
    total: int


# ============ Channel Schemas ============

class ChannelCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None


class ChannelResponse(BaseModel):
    id: int
    group_id: int
    name: str
    description: Optional[str]
    is_default: bool
    created_at: datetime
    unread_count: Optional[int] = 0

    class Config:
        from_attributes = True


class ChannelListResponse(BaseModel):
    channels: List[ChannelResponse]
    total: int


# ============ Message Schemas ============

class MessageCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=4000)


class MessageResponse(BaseModel):
    id: int
    channel_id: int
    sender_id: str
    sender_email: Optional[str]
    sender_name: Optional[str]
    content: str
    created_at: datetime
    is_read: bool

    class Config:
        from_attributes = True


class MessageListResponse(BaseModel):
    messages: List[MessageResponse]
    total: int
    has_more: bool


# ============ Board Schemas ============

class BoardCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None


class BoardColumnCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=100)
    color: Optional[str] = "#6B7280"


class BoardColumnUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=100)
    order_index: Optional[int] = None
    color: Optional[str] = None


class BoardCardCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    assigned_to: Optional[str] = None
    assigned_name: Optional[str] = None
    due_date: Optional[datetime] = None
    priority: Optional[str] = "medium"


class BoardCardUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    column_id: Optional[int] = None
    order_index: Optional[int] = None
    assigned_to: Optional[str] = None
    assigned_name: Optional[str] = None
    due_date: Optional[datetime] = None
    priority: Optional[str] = None


class BoardCardResponse(BaseModel):
    id: int
    column_id: int
    title: str
    description: Optional[str]
    order_index: int
    assigned_to: Optional[str]
    assigned_name: Optional[str]
    due_date: Optional[datetime]
    priority: str
    created_at: datetime
    created_by: str

    class Config:
        from_attributes = True


class BoardColumnResponse(BaseModel):
    id: int
    board_id: int
    title: str
    order_index: int
    color: str
    cards: List[BoardCardResponse] = []

    class Config:
        from_attributes = True


class BoardResponse(BaseModel):
    id: int
    group_id: int
    name: str
    description: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class BoardDetailResponse(BoardResponse):
    columns: List[BoardColumnResponse] = []


class BoardListResponse(BaseModel):
    boards: List[BoardResponse]
    total: int


# ============ WebSocket Schemas ============

class WebSocketMessage(BaseModel):
    type: str  # "message", "typing", "join", "leave"
    data: dict


class ChatMessageEvent(BaseModel):
    type: str = "message"
    message: MessageResponse


class TypingEvent(BaseModel):
    type: str = "typing"
    user_id: str
    user_name: str
    is_typing: bool


# ============ Unread Count Schema ============

class UnreadCountResponse(BaseModel):
    total_unread: int
    channels: List[dict] = []
