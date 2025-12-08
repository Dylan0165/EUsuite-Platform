import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserPlus,
  MessageSquare,
  Search,
  MoreVertical,
  Trash2,
  Ban,
  X,
} from 'lucide-react';
import { contactsApi, usersApi, dmApi } from '../api/client';
import type { Contact, SearchUser } from '../types';

export default function ContactsPage() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeOptions, setActiveOptions] = useState<number | null>(null);

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const response = await contactsApi.list();
      setContacts(response.contacts);
    } catch (err) {
      console.error('Failed to load contacts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const response = await usersApi.search(query);
      // Filter out existing contacts
      const contactIds = new Set(contacts.map((c) => c.user_id));
      setSearchResults(response.users.filter((u) => !contactIds.has(u.user_id)));
    } catch (err) {
      console.error('Failed to search users:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleAddContact = async (user: SearchUser) => {
    try {
      const contact = await contactsApi.add(user.user_id, user.email || undefined, user.username);
      setContacts((prev) => [...prev, contact]);
      setSearchResults((prev) => prev.filter((u) => u.user_id !== user.user_id));
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to add contact');
    }
  };

  const handleRemoveContact = async (contactId: number) => {
    if (!confirm('Remove this contact?')) return;
    try {
      await contactsApi.remove(contactId);
      setContacts((prev) => prev.filter((c) => c.id !== contactId));
    } catch (err) {
      console.error('Failed to remove contact:', err);
    }
    setActiveOptions(null);
  };

  const handleBlockContact = async (contactId: number) => {
    if (!confirm('Block this user?')) return;
    try {
      await contactsApi.block(contactId);
      setContacts((prev) => prev.filter((c) => c.id !== contactId));
    } catch (err) {
      console.error('Failed to block contact:', err);
    }
    setActiveOptions(null);
  };

  const handleStartChat = async (contact: Contact) => {
    try {
      const conversation = await dmApi.getOrCreateConversation(
        contact.user_id,
        contact.email || undefined,
        contact.name || undefined
      );
      navigate(`/messages/${conversation.id}`);
    } catch (err) {
      console.error('Failed to start chat:', err);
    }
  };

  const getInitials = (name: string | null, email: string | null) => {
    const displayName = name || email?.split('@')[0] || 'U';
    return displayName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getDisplayName = (contact: Contact) => {
    return contact.nickname || contact.name || contact.email?.split('@')[0] || 'Unknown';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-50 overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 flex items-center gap-2"
          >
            <UserPlus className="h-5 w-5" />
            Add Contact
          </button>
        </div>

        {/* Contacts Grid */}
        {contacts.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Users className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No contacts yet</h3>
            <p className="text-gray-500 mb-4">Add contacts to start chatting and calling</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
            >
              Add your first contact
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-4"
              >
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-lg font-medium">
                  {getInitials(contact.name, contact.email)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 truncate">{getDisplayName(contact)}</h3>
                  <p className="text-sm text-gray-500 truncate">{contact.email}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleStartChat(contact)}
                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
                    title="Message"
                  >
                    <MessageSquare className="h-5 w-5" />
                  </button>
                  <div className="relative">
                    <button
                      onClick={() => setActiveOptions(activeOptions === contact.id ? null : contact.id)}
                      className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
                    >
                      <MoreVertical className="h-5 w-5" />
                    </button>
                    {activeOptions === contact.id && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                        <button
                          onClick={() => handleRemoveContact(contact.id)}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <Trash2 className="h-4 w-4" />
                          Remove contact
                        </button>
                        <button
                          onClick={() => handleBlockContact(contact.id)}
                          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                        >
                          <Ban className="h-4 w-4" />
                          Block user
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Contact Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Add Contact</h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search by name or email..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  autoFocus
                />
              </div>
              <div className="mt-4 max-h-64 overflow-y-auto">
                {searching ? (
                  <div className="py-8 text-center text-gray-500">Searching...</div>
                ) : searchResults.length > 0 ? (
                  <div className="space-y-2">
                    {searchResults.map((user) => (
                      <div
                        key={user.user_id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium"
                            style={{ backgroundColor: user.avatar_color || '#3B82F6' }}
                          >
                            {user.username.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{user.username}</p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleAddContact(user)}
                          className="px-3 py-1 bg-primary-500 text-white text-sm rounded-lg hover:bg-primary-600"
                        >
                          Add
                        </button>
                      </div>
                    ))}
                  </div>
                ) : searchQuery.length >= 2 ? (
                  <div className="py-8 text-center text-gray-500">No users found</div>
                ) : (
                  <div className="py-8 text-center text-gray-500">
                    Type at least 2 characters to search
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
