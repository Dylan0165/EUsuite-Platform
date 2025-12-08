"""
EUMail Database Models
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean
from app.database import Base


class MailMessage(Base):
    """Mail message model"""
    __tablename__ = "mail_messages"

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(String(255), nullable=False, index=True)
    sender_email = Column(String(255), nullable=False)
    sender_username = Column(String(255), nullable=True)
    recipient_id = Column(String(255), nullable=False, index=True)
    recipient_email = Column(String(255), nullable=False)
    subject = Column(String(500), nullable=False)
    body = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    is_read = Column(Boolean, default=False)

    def __repr__(self):
        return f"<MailMessage(id={self.id}, subject='{self.subject}', from={self.sender_email})>"
