// TypeScript type definitions for EUGroups

export interface User {
  user_id: string;
  email: string;
  username: string;
}

export interface Group {
  id: number;
  name: string;
  description: string | null;
  owner_id: string;
  avatar_color: string;
  created_at: string;
  member_count: number;
  channel_count: number;
}

export interface GroupMember {
  id: number;
  user_id: string;
  user_email: string | null;
  user_name: string | null;
  role: 'admin' | 'member';
  joined_at: string;
}

export interface GroupDetail extends Group {
  members: GroupMember[];
  is_member: boolean;
  user_role: string | null;
}

export interface Channel {
  id: number;
  group_id: number;
  name: string;
  description: string | null;
  is_default: boolean;
  created_at: string;
  unread_count: number;
}

export interface Message {
  id: number;
  channel_id: number;
  sender_id: string;
  sender_email: string | null;
  sender_name: string | null;
  content: string;
  created_at: string;
  is_read: boolean;
}

export interface Board {
  id: number;
  group_id: number;
  name: string;
  description: string | null;
  created_at: string;
}

export interface BoardColumn {
  id: number;
  board_id: number;
  title: string;
  order_index: number;
  color: string;
  cards: BoardCard[];
}

export interface BoardCard {
  id: number;
  column_id: number;
  title: string;
  description: string | null;
  order_index: number;
  assigned_to: string | null;
  assigned_name: string | null;
  due_date: string | null;
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  created_by: string;
}

export interface BoardDetail extends Board {
  columns: BoardColumn[];
}

// WebSocket message types
export interface WSMessage {
  type: string;
  [key: string]: unknown;
}

export interface NewMessageEvent {
  type: 'new_message';
  message: Message;
}

export interface TypingEvent {
  type: 'typing';
  user_id: string;
  username: string;
  is_typing: boolean;
}

export interface UserJoinedEvent {
  type: 'user_joined';
  user_id: string;
  username: string;
}

export interface UserLeftEvent {
  type: 'user_left';
  user_id: string;
  username: string;
}

// API response types
export interface GroupListResponse {
  groups: Group[];
  total: number;
}

export interface ChannelListResponse {
  channels: Channel[];
  total: number;
}

export interface MessageListResponse {
  messages: Message[];
  total: number;
  has_more: boolean;
}

export interface BoardListResponse {
  boards: Board[];
  total: number;
}

// ============ Direct Messages Types ============

export interface Contact {
  id: number;
  user_id: string;
  email: string | null;
  name: string | null;
  nickname: string | null;
  created_at: string;
}

export interface Conversation {
  id: number;
  participants: {
    user_id: string;
    email: string | null;
    name: string | null;
  }[];
  last_message: {
    content: string | null;
    sender_id: string | null;
    sender_name: string | null;
    created_at: string | null;
    type: string | null;
  } | null;
  unread_count: number;
  updated_at: string;
}

export interface DirectMessage {
  id: number;
  sender_id: string;
  sender_email: string | null;
  sender_name: string | null;
  content: string;
  created_at: string;
  type: string;
}

export interface SearchUser {
  user_id: string;
  email: string | null;
  username: string;
  avatar_color?: string;
}

export interface SearchGroup {
  id: number;
  name: string;
  description: string | null;
  avatar_color: string;
  member_count: number;
  is_member: boolean;
}

// ============ Calls Types ============

export interface Call {
  id: number;
  room_id: string;
  call_type: 'voice' | 'video';
  call_mode: 'direct' | 'group';
  status: 'ringing' | 'active' | 'ended' | 'missed' | 'declined';
  initiator_id: string;
  initiator_name: string | null;
  started_at: string;
  answered_at: string | null;
  ended_at: string | null;
  participants: CallParticipant[];
}

export interface CallParticipant {
  user_id: string;
  user_name: string | null;
  status: 'invited' | 'ringing' | 'joined' | 'left' | 'declined';
  joined_at: string | null;
}

export interface IncomingCall {
  call_id: number;
  room_id: string;
  call_type: 'voice' | 'video';
  call_mode: 'direct' | 'group';
  initiator_id: string;
  initiator_name: string | null;
  started_at: string;
}

export interface CallHistoryItem {
  id: number;
  call_type: 'voice' | 'video';
  call_mode: 'direct' | 'group';
  status: string;
  initiator_id: string;
  initiator_name: string | null;
  participants: { user_id: string; user_name: string | null }[];
  started_at: string;
  ended_at: string | null;
  was_initiator: boolean;
}
