import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, User, X, UserPlus } from 'lucide-react';
import { usersApi, contactsApi, dmApi, groupsApi } from '../api/client';
import type { SearchUser, SearchGroup } from '../types';

interface GlobalSearchProps {
  onClose?: () => void;
}

export default function GlobalSearch({ onClose }: GlobalSearchProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'groups'>('users');
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [groups, setGroups] = useState<SearchGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (query.length >= 2) {
        performSearch();
      } else {
        setUsers([]);
        setGroups([]);
      }
    }, 300);

    return () => clearTimeout(debounce);
  }, [query, activeTab]);

  const performSearch = async () => {
    setLoading(true);
    try {
      if (activeTab === 'users') {
        const response = await usersApi.search(query);
        setUsers(response.users);
      } else {
        const response = await usersApi.searchGroups(query);
        setGroups(response.groups);
      }
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddContact = async (user: SearchUser) => {
    try {
      await contactsApi.add(user.user_id, user.email || undefined, user.username);
      // Update UI or show success
      alert(`${user.username} added to contacts!`);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to add contact');
    }
  };

  const handleStartChat = async (user: SearchUser) => {
    try {
      const conversation = await dmApi.getOrCreateConversation(
        user.user_id,
        user.email || undefined,
        user.username
      );
      navigate(`/messages/${conversation.id}`);
      onClose?.();
    } catch (err) {
      console.error('Failed to start chat:', err);
    }
  };

  const handleJoinGroup = async (group: SearchGroup) => {
    try {
      await groupsApi.join(group.id);
      navigate(`/groups/${group.id}`);
      onClose?.();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to join group');
    }
  };

  const handleViewGroup = (group: SearchGroup) => {
    navigate(`/groups/${group.id}`);
    onClose?.();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 pt-20 px-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
        {/* Search Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search users or groups..."
              className="w-full pl-12 pr-12 py-3 bg-gray-100 rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex mt-4 gap-2">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                activeTab === 'users'
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <User className="h-4 w-4" />
              Users
            </button>
            <button
              onClick={() => setActiveTab('groups')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                activeTab === 'groups'
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Users className="h-4 w-4" />
              Groups
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent mx-auto mb-2"></div>
              Searching...
            </div>
          ) : query.length < 2 ? (
            <div className="p-8 text-center text-gray-500">
              Type at least 2 characters to search
            </div>
          ) : activeTab === 'users' ? (
            users.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No users found</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {users.map((user) => (
                  <div key={user.user_id} className="p-4 hover:bg-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-medium"
                        style={{ backgroundColor: user.avatar_color || '#3B82F6' }}
                      >
                        {user.username.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{user.username}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleStartChat(user)}
                        className="px-3 py-1.5 bg-primary-500 text-white text-sm rounded-lg hover:bg-primary-600"
                      >
                        Message
                      </button>
                      <button
                        onClick={() => handleAddContact(user)}
                        className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg"
                        title="Add to contacts"
                      >
                        <UserPlus className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : groups.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No groups found</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {groups.map((group) => (
                <div key={group.id} className="p-4 hover:bg-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                      style={{ backgroundColor: group.avatar_color }}
                    >
                      {group.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{group.name}</p>
                      <p className="text-sm text-gray-500">
                        {group.member_count} member{group.member_count !== 1 ? 's' : ''}
                        {group.description && ` • ${group.description.slice(0, 50)}...`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => group.is_member ? handleViewGroup(group) : handleJoinGroup(group)}
                    className={`px-3 py-1.5 text-sm rounded-lg ${
                      group.is_member
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        : 'bg-primary-500 text-white hover:bg-primary-600'
                    }`}
                  >
                    {group.is_member ? 'View' : 'Join'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Close Button */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full py-2 text-gray-600 hover:text-gray-900"
          >
            Press ESC or click to close
          </button>
        </div>
      </div>
    </div>
  );
}
