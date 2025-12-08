import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  MessageSquare,
  Send,
  Search,
  MoreVertical,
  Trash2,
  ArrowLeft,
} from 'lucide-react';
import { dmApi } from '../api/client';
import type { Conversation, DirectMessage } from '../types';

export default function MessagesPage() {
  const navigate = useNavigate();
  const { conversationId } = useParams<{ conversationId: string }>();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (conversationId) {
      const conv = conversations.find((c) => c.id === parseInt(conversationId));
      if (conv) {
        setSelectedConversation(conv);
        loadMessages(parseInt(conversationId));
      }
    }
  }, [conversationId, conversations]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const response = await dmApi.listConversations();
      setConversations(response.conversations);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (convId: number) => {
    try {
      const response = await dmApi.getMessages(convId);
      setMessages(response.messages);
      scrollToBottom();
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConversation(conv);
    navigate(`/messages/${conv.id}`);
    loadMessages(conv.id);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || sending) return;

    try {
      setSending(true);
      const message = await dmApi.sendMessage(selectedConversation.id, newMessage.trim());
      setMessages((prev) => [...prev, message]);
      setNewMessage('');
      scrollToBottom();
      
      // Update conversation in list
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedConversation.id
            ? {
                ...c,
                last_message: {
                  content: message.content,
                  sender_id: message.sender_id,
                  sender_name: message.sender_name,
                  created_at: message.created_at,
                  type: message.type,
                },
                updated_at: message.created_at,
              }
            : c
        )
      );
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  const handleDeleteConversation = async () => {
    if (!selectedConversation || !confirm('Delete this conversation?')) return;
    try {
      await dmApi.deleteConversation(selectedConversation.id);
      setConversations((prev) => prev.filter((c) => c.id !== selectedConversation.id));
      setSelectedConversation(null);
      setMessages([]);
      navigate('/messages');
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const getParticipantName = (conv: Conversation) => {
    const p = conv.participants[0];
    return p?.name || p?.email?.split('@')[0] || 'Unknown';
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Conversations List */}
      <div className={`w-80 bg-white border-r border-gray-200 flex flex-col ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
          <div className="mt-3 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No conversations yet</p>
              <p className="text-sm mt-1">Search for users to start a chat</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => handleSelectConversation(conv)}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedConversation?.id === conv.id ? 'bg-primary-50' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-medium">
                    {getInitials(getParticipantName(conv))}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900 truncate">
                        {getParticipantName(conv)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatTime(conv.last_message?.created_at || conv.updated_at)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 truncate">
                      {conv.last_message?.content || 'No messages yet'}
                    </p>
                  </div>
                  {conv.unread_count > 0 && (
                    <div className="w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center">
                      <span className="text-xs text-white font-medium">{conv.unread_count}</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col ${!selectedConversation ? 'hidden md:flex' : 'flex'}`}>
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="h-16 px-4 bg-white border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setSelectedConversation(null);
                    navigate('/messages');
                  }}
                  className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-medium">
                  {getInitials(getParticipantName(selectedConversation))}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">
                    {getParticipantName(selectedConversation)}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {selectedConversation.participants[0]?.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <button
                    onClick={() => setShowOptions(!showOptions)}
                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
                  >
                    <MoreVertical className="h-5 w-5" />
                  </button>
                  {showOptions && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                      <button
                        onClick={() => {
                          handleDeleteConversation();
                          setShowOptions(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete conversation
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.sender_id === selectedConversation.participants[0]?.user_id
                      ? 'justify-start'
                      : 'justify-end'
                  }`}
                >
                  <div
                    className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-2xl ${
                      msg.sender_id === selectedConversation.participants[0]?.user_id
                        ? 'bg-white text-gray-900 rounded-bl-md'
                        : 'bg-primary-500 text-white rounded-br-md'
                    }`}
                  >
                    <p className="break-words">{msg.content}</p>
                    <p
                      className={`text-xs mt-1 ${
                        msg.sender_id === selectedConversation.participants[0]?.user_id
                          ? 'text-gray-400'
                          : 'text-primary-100'
                      }`}
                    >
                      {formatTime(msg.created_at)}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-gray-200">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="p-2 bg-primary-500 text-white rounded-full hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">Your messages</h3>
              <p className="text-gray-500">Select a conversation to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
