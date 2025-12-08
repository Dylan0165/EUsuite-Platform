import { API_BASE_URL } from '../config/constants';

export interface MailMessage {
  id: number;
  sender_id: string;
  sender_email: string;
  sender_username?: string;
  recipient_id: string;
  recipient_email: string;
  subject: string;
  body: string;
  created_at: string;
  is_read: boolean;
}

export interface MailPreview {
  id: number;
  sender_email: string;
  sender_username?: string;
  subject: string;
  created_at: string;
  is_read: boolean;
}

export interface InboxResponse {
  messages: MailPreview[];
  total: number;
  unread: number;
}

export interface SentResponse {
  messages: MailPreview[];
  total: number;
}

export interface UnreadCountResponse {
  count: number;
}

export interface SendMessageData {
  recipient_email: string;
  subject: string;
  body: string;
}

// Fetch inbox messages
export async function getInbox(): Promise<InboxResponse> {
  const response = await fetch(`${API_BASE_URL}/api/mail/messages`, {
    method: 'GET',
    credentials: 'include',
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch inbox');
  }
  
  return response.json();
}

// Fetch sent messages
export async function getSent(): Promise<SentResponse> {
  const response = await fetch(`${API_BASE_URL}/api/mail/sent`, {
    method: 'GET',
    credentials: 'include',
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch sent messages');
  }
  
  return response.json();
}

// Fetch single message
export async function getMessage(id: number): Promise<MailMessage> {
  const response = await fetch(`${API_BASE_URL}/api/mail/messages/${id}`, {
    method: 'GET',
    credentials: 'include',
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch message');
  }
  
  return response.json();
}

// Send a new message
export async function sendMessage(data: SendMessageData): Promise<{ success: boolean; mail_id: number }> {
  const response = await fetch(`${API_BASE_URL}/api/mail/messages`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error('Failed to send message');
  }
  
  return response.json();
}

// Mark message as read
export async function markAsRead(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/mail/messages/${id}/read`, {
    method: 'POST',
    credentials: 'include',
  });
  
  if (!response.ok) {
    throw new Error('Failed to mark as read');
  }
}

// Delete a message
export async function deleteMessage(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/mail/messages/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  
  if (!response.ok) {
    throw new Error('Failed to delete message');
  }
}

// Get unread count
export async function getUnreadCount(): Promise<number> {
  const response = await fetch(`${API_BASE_URL}/api/mail/unread-count`, {
    method: 'GET',
    credentials: 'include',
  });
  
  if (!response.ok) {
    return 0;
  }
  
  const data: UnreadCountResponse = await response.json();
  return data.count;
}
