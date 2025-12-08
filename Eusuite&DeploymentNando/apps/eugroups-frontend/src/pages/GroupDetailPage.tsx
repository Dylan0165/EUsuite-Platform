import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Hash,
  Plus,
  Grid3X3,
  Send,
  ChevronLeft,
  MoreVertical,
  LogOut,
  Trash2,
} from 'lucide-react';
import { groupsApi, channelsApi, messagesApi, boardsApi } from '../api/client';
import { useWebSocket } from '../hooks/useWebSocket';
import type { GroupDetail, Channel, Message, Board, TypingEvent } from '../types';

export default function GroupDetailPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<number>();

  // WebSocket connection for real-time chat
  const { connected, sendTyping } = useWebSocket({
    channelId: selectedChannel?.id || 0,
    onMessage: (message) => {
      setMessages((prev) => [...prev, message]);
      scrollToBottom();
    },
    onTyping: (event: TypingEvent) => {
      setTypingUsers((prev) => {
        const next = new Map(prev);
        if (event.is_typing) {
          next.set(event.user_id, event.username);
        } else {
          next.delete(event.user_id);
        }
        return next;
      });
    },
  });

  useEffect(() => {
    if (groupId) {
      loadGroupData(parseInt(groupId));
    }
  }, [groupId]);

  useEffect(() => {
    if (selectedChannel) {
      loadMessages(selectedChannel.id);
    }
  }, [selectedChannel]);

  const loadGroupData = async (id: number) => {
    try {
      setLoading(true);
      const [groupData, channelsData, boardsData] = await Promise.all([
        groupsApi.get(id),
        channelsApi.list(id),
        boardsApi.list(id),
      ]);
      setGroup(groupData);
      setChannels(channelsData.channels);
      setBoards(boardsData.boards);

      // Select default channel
      const defaultChannel = channelsData.channels.find((c) => c.is_default);
      if (defaultChannel) {
        setSelectedChannel(defaultChannel);
      } else if (channelsData.channels.length > 0) {
        setSelectedChannel(channelsData.channels[0]);
      }
    } catch (err) {
      console.error('Failed to load group:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (channelId: number) => {
    try {
      setMessagesLoading(true);
      const response = await messagesApi.list(channelId);
      setMessages(response.messages);
      scrollToBottom();
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setMessagesLoading(false);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChannel || sending) return;

    try {
      setSending(true);
      const message = await messagesApi.send(selectedChannel.id, newMessage.trim());
      setMessages((prev) => [...prev, message]);
      setNewMessage('');
      scrollToBottom();
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);

    // Send typing indicator
    sendTyping(true);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = window.setTimeout(() => {
      sendTyping(false);
    }, 2000);
  };

  const handleLeaveGroup = async () => {
    if (!group || !confirm('Are you sure you want to leave this group?')) return;

    try {
      await groupsApi.leave(group.id);
      navigate('/groups');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to leave group');
    }
  };

  const handleDeleteGroup = async () => {
    if (!group || !confirm('Are you sure you want to delete this group? This cannot be undone.')) return;

    try {
      await groupsApi.delete(group.id);
      navigate('/groups');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete group');
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-gray-600 mb-4">Group not found</p>
        <Link to="/groups" className="text-primary-500 hover:underline">
          Back to Groups
        </Link>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/groups" className="text-gray-400 hover:text-gray-600">
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
            style={{ backgroundColor: group.avatar_color }}
          >
            {group.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{group.name}</h1>
            <p className="text-sm text-gray-500">{group.member_count} members</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {connected && (
            <span className="flex items-center gap-1 text-sm text-green-600">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              Connected
            </span>
          )}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative"
          >
            <MoreVertical className="w-5 h-5 text-gray-600" />
          </button>

          {/* Settings Dropdown */}
          {showSettings && (
            <div className="absolute right-6 top-16 bg-white rounded-lg shadow-lg border border-gray-200 py-2 w-48 z-10">
              <button
                onClick={() => {
                  setShowSettings(false);
                  handleLeaveGroup();
                }}
                className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Leave Group
              </button>
              {group.user_role === 'admin' && (
                <button
                  onClick={() => {
                    setShowSettings(false);
                    handleDeleteGroup();
                  }}
                  className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Group
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Channels & Boards */}
        <aside className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col">
          {/* Channels */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Channels
              </h3>
              {group.user_role === 'admin' && (
                <button className="text-gray-400 hover:text-gray-600">
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="space-y-1">
              {channels.map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => setSelectedChannel(channel)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                    selectedChannel?.id === channel.id
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Hash className="w-4 h-4" />
                  <span className="flex-1 truncate">{channel.name}</span>
                  {channel.unread_count > 0 && (
                    <span className="bg-primary-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                      {channel.unread_count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Boards */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Boards
              </h3>
              {group.user_role === 'admin' && (
                <button className="text-gray-400 hover:text-gray-600">
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="space-y-1">
              {boards.map((board) => (
                <Link
                  key={board.id}
                  to={`/groups/${group.id}/boards/${board.id}`}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <Grid3X3 className="w-4 h-4" />
                  <span className="truncate">{board.name}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Members */}
          <div className="p-4 border-t border-gray-200 flex-1 overflow-auto">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Members
            </h3>
            <div className="space-y-2">
              {group.members.map((member) => (
                <div key={member.id} className="flex items-center gap-2 text-sm">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-medium">
                    {(member.user_name || member.user_email || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-gray-700">
                      {member.user_name || member.user_email}
                    </p>
                    {member.role === 'admin' && (
                      <span className="text-xs text-primary-600">Admin</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedChannel ? (
            <>
              {/* Channel Header */}
              <div className="px-6 py-3 border-b border-gray-200 bg-white">
                <div className="flex items-center gap-2">
                  <Hash className="w-5 h-5 text-gray-400" />
                  <h2 className="font-semibold text-gray-900">{selectedChannel.name}</h2>
                </div>
                {selectedChannel.description && (
                  <p className="text-sm text-gray-500 mt-1">{selectedChannel.description}</p>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messagesLoading ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary-500 border-t-transparent"></div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  messages.map((message, index) => {
                    const prevMessage = messages[index - 1];
                    const showDateSeparator =
                      !prevMessage ||
                      formatDate(message.created_at) !== formatDate(prevMessage.created_at);

                    return (
                      <div key={message.id}>
                        {showDateSeparator && (
                          <div className="flex items-center gap-4 my-4">
                            <div className="flex-1 border-t border-gray-200"></div>
                            <span className="text-xs text-gray-400">
                              {formatDate(message.created_at)}
                            </span>
                            <div className="flex-1 border-t border-gray-200"></div>
                          </div>
                        )}
                        <div className="flex items-start gap-3 message-new">
                          <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-medium text-sm flex-shrink-0">
                            {(message.sender_name || message.sender_email || '?')
                              .charAt(0)
                              .toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2">
                              <span className="font-medium text-gray-900">
                                {message.sender_name || message.sender_email}
                              </span>
                              <span className="text-xs text-gray-400">
                                {formatTime(message.created_at)}
                              </span>
                            </div>
                            <p className="text-gray-700 message-content">{message.content}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Typing Indicator */}
              {typingUsers.size > 0 && (
                <div className="px-6 py-2 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="typing-dot w-2 h-2 bg-gray-400 rounded-full"></span>
                      <span className="typing-dot w-2 h-2 bg-gray-400 rounded-full"></span>
                      <span className="typing-dot w-2 h-2 bg-gray-400 rounded-full"></span>
                    </div>
                    <span>
                      {Array.from(typingUsers.values()).join(', ')}{' '}
                      {typingUsers.size === 1 ? 'is' : 'are'} typing...
                    </span>
                  </div>
                </div>
              )}

              {/* Message Input */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 bg-white">
                <div className="flex items-end gap-3">
                  <textarea
                    value={newMessage}
                    onChange={handleMessageChange}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                    placeholder={`Message #${selectedChannel.name}`}
                    rows={1}
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sending}
                    className="p-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              Select a channel to start chatting
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
