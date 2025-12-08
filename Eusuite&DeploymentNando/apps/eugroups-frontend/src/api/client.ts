import axios from 'axios';
import type {
  Group,
  GroupDetail,
  GroupListResponse,
  Channel,
  ChannelListResponse,
  Message,
  MessageListResponse,
  BoardDetail,
  BoardListResponse,
  BoardCard,
  BoardColumn,
} from '../types';

// API base URL - in production this will be the backend service
const API_BASE = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // Important for SSO cookie
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add response interceptor for auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login with return URL
      const loginUrl = import.meta.env.VITE_LOGIN_URL || 'http://192.168.124.50:30081';
      const returnUrl = encodeURIComponent(window.location.href);
      window.location.href = `${loginUrl}?redirect=${returnUrl}`;
    }
    return Promise.reject(error);
  }
);

// ============ Groups API ============

export const groupsApi = {
  list: async (myGroups = false): Promise<GroupListResponse> => {
    const { data } = await api.get('/api/groups', { params: { my_groups: myGroups } });
    return data;
  },

  get: async (groupId: number): Promise<GroupDetail> => {
    const { data } = await api.get(`/api/groups/${groupId}`);
    return data;
  },

  create: async (name: string, description?: string, avatar_color?: string): Promise<GroupDetail> => {
    const { data } = await api.post('/api/groups', { name, description, avatar_color });
    return data;
  },

  update: async (groupId: number, updates: { name?: string; description?: string; avatar_color?: string }): Promise<Group> => {
    const { data } = await api.put(`/api/groups/${groupId}`, updates);
    return data;
  },

  delete: async (groupId: number): Promise<void> => {
    await api.delete(`/api/groups/${groupId}`);
  },

  join: async (groupId: number): Promise<void> => {
    await api.post(`/api/groups/${groupId}/join`);
  },

  leave: async (groupId: number): Promise<void> => {
    await api.delete(`/api/groups/${groupId}/leave`);
  },

  getMembers: async (groupId: number): Promise<{ id: number; user_id: string; user_name: string; role: string }[]> => {
    const { data } = await api.get(`/api/groups/${groupId}/members`);
    return data;
  },
};

// ============ Channels API ============

export const channelsApi = {
  list: async (groupId: number): Promise<ChannelListResponse> => {
    const { data } = await api.get(`/api/groups/${groupId}/channels`);
    return data;
  },

  create: async (groupId: number, name: string, description?: string): Promise<Channel> => {
    const { data } = await api.post(`/api/groups/${groupId}/channels`, { name, description });
    return data;
  },

  delete: async (channelId: number): Promise<void> => {
    await api.delete(`/api/channels/${channelId}`);
  },
};

// ============ Messages API ============

export const messagesApi = {
  list: async (channelId: number, beforeId?: number, limit = 50): Promise<MessageListResponse> => {
    const { data } = await api.get(`/api/channels/${channelId}/messages`, {
      params: { before_id: beforeId, limit },
    });
    return data;
  },

  send: async (channelId: number, content: string): Promise<Message> => {
    const { data } = await api.post(`/api/channels/${channelId}/messages`, { content });
    return data;
  },
};

// ============ Boards API ============

export const boardsApi = {
  list: async (groupId: number): Promise<BoardListResponse> => {
    const { data } = await api.get(`/api/groups/${groupId}/boards`);
    return data;
  },

  get: async (boardId: number): Promise<BoardDetail> => {
    const { data } = await api.get(`/api/boards/${boardId}`);
    return data;
  },

  create: async (groupId: number, name: string, description?: string): Promise<BoardDetail> => {
    const { data } = await api.post(`/api/groups/${groupId}/boards`, { name, description });
    return data;
  },

  delete: async (boardId: number): Promise<void> => {
    await api.delete(`/api/boards/${boardId}`);
  },
};

// ============ Columns API ============

export const columnsApi = {
  create: async (boardId: number, title: string, color?: string): Promise<BoardColumn> => {
    const { data } = await api.post(`/api/boards/${boardId}/columns`, { title, color });
    return data;
  },

  update: async (columnId: number, updates: { title?: string; color?: string }): Promise<BoardColumn> => {
    const { data } = await api.put(`/api/columns/${columnId}`, updates);
    return data;
  },

  delete: async (columnId: number): Promise<void> => {
    await api.delete(`/api/columns/${columnId}`);
  },

  reorder: async (boardId: number, columnIds: number[]): Promise<void> => {
    await api.put(`/api/boards/${boardId}/columns/reorder`, columnIds);
  },
};

// ============ Cards API ============

export const cardsApi = {
  create: async (
    columnId: number,
    title: string,
    description?: string,
    priority?: string,
    assigned_to?: string,
    assigned_name?: string,
    due_date?: string
  ): Promise<BoardCard> => {
    const { data } = await api.post(`/api/columns/${columnId}/cards`, {
      title,
      description,
      priority,
      assigned_to,
      assigned_name,
      due_date,
    });
    return data;
  },

  update: async (
    cardId: number,
    updates: {
      title?: string;
      description?: string;
      priority?: string;
      assigned_to?: string | null;
      assigned_name?: string | null;
      due_date?: string | null;
    }
  ): Promise<BoardCard> => {
    const { data } = await api.put(`/api/cards/${cardId}`, updates);
    return data;
  },

  move: async (cardId: number, targetColumnId: number, targetIndex: number): Promise<void> => {
    await api.put(`/api/cards/${cardId}/move`, null, {
      params: { target_column_id: targetColumnId, target_index: targetIndex },
    });
  },

  delete: async (cardId: number): Promise<void> => {
    await api.delete(`/api/cards/${cardId}`);
  },
};

// ============ Users & Search API ============

export const usersApi = {
  search: async (query: string, limit = 20): Promise<{ users: import('../types').SearchUser[] }> => {
    const { data } = await api.get('/api/users/search', { params: { q: query, limit } });
    return data;
  },

  searchGroups: async (query: string, limit = 20): Promise<{ groups: import('../types').SearchGroup[] }> => {
    const { data } = await api.get('/api/users/groups/search', { params: { q: query, limit } });
    return data;
  },
};

// ============ Contacts API ============

export const contactsApi = {
  list: async (): Promise<{ contacts: import('../types').Contact[] }> => {
    const { data } = await api.get('/api/users/contacts');
    return data;
  },

  add: async (
    contactUserId: string,
    contactEmail?: string,
    contactName?: string,
    nickname?: string
  ): Promise<import('../types').Contact> => {
    const { data } = await api.post('/api/users/contacts', null, {
      params: { contact_user_id: contactUserId, contact_email: contactEmail, contact_name: contactName, nickname },
    });
    return data;
  },

  remove: async (contactId: number): Promise<void> => {
    await api.delete(`/api/users/contacts/${contactId}`);
  },

  block: async (contactId: number): Promise<void> => {
    await api.post(`/api/users/contacts/${contactId}/block`);
  },

  listBlocked: async (): Promise<{ blocked: import('../types').Contact[] }> => {
    const { data } = await api.get('/api/users/blocked');
    return data;
  },
};

// ============ Direct Messages API ============

export const dmApi = {
  listConversations: async (): Promise<{ conversations: import('../types').Conversation[] }> => {
    const { data } = await api.get('/api/dm/conversations');
    return data;
  },

  getOrCreateConversation: async (
    participantUserId: string,
    participantEmail?: string,
    participantName?: string
  ): Promise<{ id: number; is_new: boolean; participant: { user_id: string; email: string | null; name: string | null } }> => {
    const { data } = await api.post('/api/dm/conversations', null, {
      params: { participant_user_id: participantUserId, participant_email: participantEmail, participant_name: participantName },
    });
    return data;
  },

  getConversation: async (conversationId: number): Promise<import('../types').Conversation> => {
    const { data } = await api.get(`/api/dm/conversations/${conversationId}`);
    return data;
  },

  getMessages: async (
    conversationId: number,
    limit = 50,
    beforeId?: number
  ): Promise<{ messages: import('../types').DirectMessage[] }> => {
    const { data } = await api.get(`/api/dm/conversations/${conversationId}/messages`, {
      params: { limit, before_id: beforeId },
    });
    return data;
  },

  sendMessage: async (
    conversationId: number,
    content: string,
    messageType = 'text'
  ): Promise<import('../types').DirectMessage> => {
    const { data } = await api.post(`/api/dm/conversations/${conversationId}/messages`, null, {
      params: { content, message_type: messageType },
    });
    return data;
  },

  deleteConversation: async (conversationId: number): Promise<void> => {
    await api.delete(`/api/dm/conversations/${conversationId}`);
  },

  getUnreadCount: async (): Promise<{ total_unread: number }> => {
    const { data } = await api.get('/api/dm/unread');
    return data;
  },
};

export default api;
