"""
SQLAlchemy Models for EUGroups
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.database import Base


class Group(Base):
    """Group model - represents a team/workspace"""
    __tablename__ = "eugroups_groups"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    owner_id = Column(String(50), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    avatar_color = Column(String(20), default="#3B82F6")

    # Relationships
    members = relationship("GroupMember", back_populates="group", cascade="all, delete-orphan")
    channels = relationship("Channel", back_populates="group", cascade="all, delete-orphan")
    boards = relationship("Board", back_populates="group", cascade="all, delete-orphan")


class GroupMember(Base):
    """Group membership model"""
    __tablename__ = "eugroups_members"

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("eugroups_groups.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(50), nullable=False, index=True)
    user_email = Column(String(255), nullable=True)
    user_name = Column(String(100), nullable=True)
    role = Column(String(20), default="member")  # owner, admin, member
    joined_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    group = relationship("Group", back_populates="members")


class Channel(Base):
    """Channel model - chat channels within a group"""
    __tablename__ = "eugroups_channels"

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("eugroups_groups.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    group = relationship("Group", back_populates="channels")
    messages = relationship("Message", back_populates="channel", cascade="all, delete-orphan")


class Message(Base):
    """Message model - chat messages in channels"""
    __tablename__ = "eugroups_messages"

    id = Column(Integer, primary_key=True, index=True)
    channel_id = Column(Integer, ForeignKey("eugroups_channels.id", ondelete="CASCADE"), nullable=False)
    sender_id = Column(String(50), nullable=False, index=True)
    sender_email = Column(String(255), nullable=True)
    sender_name = Column(String(100), nullable=True)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    is_read = Column(Boolean, default=False)

    # Relationships
    channel = relationship("Channel", back_populates="messages")


class Board(Base):
    """Kanban Board model"""
    __tablename__ = "eugroups_boards"

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("eugroups_groups.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    group = relationship("Group", back_populates="boards")
    columns = relationship("BoardColumn", back_populates="board", cascade="all, delete-orphan", order_by="BoardColumn.order_index")


class BoardColumn(Base):
    """Board Column model - columns in kanban board"""
    __tablename__ = "eugroups_columns"

    id = Column(Integer, primary_key=True, index=True)
    board_id = Column(Integer, ForeignKey("eugroups_boards.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(100), nullable=False)
    order_index = Column(Integer, default=0)
    color = Column(String(20), default="#6B7280")

    # Relationships
    board = relationship("Board", back_populates="columns")
    cards = relationship("BoardCard", back_populates="column", cascade="all, delete-orphan", order_by="BoardCard.order_index")


class BoardCard(Base):
    """Board Card model - cards/tasks in kanban columns"""
    __tablename__ = "eugroups_cards"

    id = Column(Integer, primary_key=True, index=True)
    column_id = Column(Integer, ForeignKey("eugroups_columns.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    order_index = Column(Integer, default=0)
    assigned_to = Column(String(50), nullable=True)  # user_id
    assigned_name = Column(String(100), nullable=True)
    due_date = Column(DateTime, nullable=True)
    priority = Column(String(20), default="medium")  # low, medium, high
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(String(50), nullable=False)

    # Relationships
    column = relationship("BoardColumn", back_populates="cards")


# ============ Direct Messages & Contacts ============

class Contact(Base):
    """User contacts - friends/connections"""
    __tablename__ = "eugroups_contacts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(50), nullable=False, index=True)  # The user who added the contact
    contact_user_id = Column(String(50), nullable=False, index=True)  # The contact's user ID
    contact_email = Column(String(255), nullable=True)
    contact_name = Column(String(100), nullable=True)
    nickname = Column(String(100), nullable=True)  # Custom nickname for contact
    created_at = Column(DateTime, default=datetime.utcnow)
    is_blocked = Column(Boolean, default=False)


class Conversation(Base):
    """Direct message conversation between users"""
    __tablename__ = "eugroups_conversations"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    participants = relationship("ConversationParticipant", back_populates="conversation", cascade="all, delete-orphan")
    messages = relationship("DirectMessage", back_populates="conversation", cascade="all, delete-orphan")


class ConversationParticipant(Base):
    """Participants in a conversation"""
    __tablename__ = "eugroups_conversation_participants"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("eugroups_conversations.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(50), nullable=False, index=True)
    user_email = Column(String(255), nullable=True)
    user_name = Column(String(100), nullable=True)
    joined_at = Column(DateTime, default=datetime.utcnow)
    last_read_at = Column(DateTime, nullable=True)

    # Relationships
    conversation = relationship("Conversation", back_populates="participants")


class DirectMessage(Base):
    """Direct message in a conversation"""
    __tablename__ = "eugroups_direct_messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("eugroups_conversations.id", ondelete="CASCADE"), nullable=False)
    sender_id = Column(String(50), nullable=False, index=True)
    sender_email = Column(String(255), nullable=True)
    sender_name = Column(String(100), nullable=True)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    is_read = Column(Boolean, default=False)
    message_type = Column(String(20), default="text")  # text, image, file, call_started, call_ended

    # Relationships
    conversation = relationship("Conversation", back_populates="messages")


# ============ Video/Voice Calls ============

class Call(Base):
    """Voice/Video call record"""
    __tablename__ = "eugroups_calls"

    id = Column(Integer, primary_key=True, index=True)
    call_type = Column(String(20), nullable=False)  # voice, video
    call_mode = Column(String(20), nullable=False)  # direct (1-on-1), group
    
    # For direct calls
    conversation_id = Column(Integer, ForeignKey("eugroups_conversations.id", ondelete="SET NULL"), nullable=True)
    # For group calls
    channel_id = Column(Integer, ForeignKey("eugroups_channels.id", ondelete="SET NULL"), nullable=True)
    
    initiator_id = Column(String(50), nullable=False)
    initiator_name = Column(String(100), nullable=True)
    
    status = Column(String(20), default="ringing")  # ringing, active, ended, missed, declined
    started_at = Column(DateTime, default=datetime.utcnow)
    answered_at = Column(DateTime, nullable=True)
    ended_at = Column(DateTime, nullable=True)
    
    # WebRTC room ID for the call
    room_id = Column(String(100), nullable=False, unique=True, index=True)

    # Relationships
    participants = relationship("CallParticipant", back_populates="call", cascade="all, delete-orphan")


class CallParticipant(Base):
    """Participants in a call"""
    __tablename__ = "eugroups_call_participants"

    id = Column(Integer, primary_key=True, index=True)
    call_id = Column(Integer, ForeignKey("eugroups_calls.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(50), nullable=False, index=True)
    user_name = Column(String(100), nullable=True)
    joined_at = Column(DateTime, nullable=True)
    left_at = Column(DateTime, nullable=True)
    status = Column(String(20), default="invited")  # invited, ringing, joined, left, declined

    # Relationships
    call = relationship("Call", back_populates="participants")
