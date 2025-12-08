import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Users, Hash, Calendar, Search } from 'lucide-react';
import { groupsApi } from '../api/client';
import type { Group } from '../types';
import CreateGroupModal from '../components/CreateGroupModal';

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'my'>('my');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadGroups();
  }, [filter]);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const response = await groupsApi.list(filter === 'my');
      setGroups(response.groups);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  const handleGroupCreated = (newGroup: Group) => {
    setGroups([newGroup, ...groups]);
    setShowCreateModal(false);
  };

  const filteredGroups = groups.filter((group) =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Groups</h1>
          <p className="text-gray-600 mt-1">Collaborate with your team</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Create Group</span>
        </button>
      </div>

      {/* Filters and Search */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setFilter('my')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === 'my'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            My Groups
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            All Groups
          </button>
        </div>

        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-500 border-t-transparent"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          {error}
          <button onClick={loadGroups} className="ml-2 underline">
            Retry
          </button>
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            {searchQuery ? 'No groups found' : 'No groups yet'}
          </h3>
          <p className="text-gray-500 mb-4">
            {searchQuery
              ? 'Try a different search term'
              : 'Create a group to start collaborating'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>Create Group</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGroups.map((group) => (
            <Link
              key={group.id}
              to={`/groups/${group.id}`}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-primary-200 transition-all"
            >
              <div className="flex items-start gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                  style={{ backgroundColor: group.avatar_color }}
                >
                  {group.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">
                    {group.name}
                  </h3>
                  {group.description && (
                    <p className="text-gray-500 text-sm mt-1 line-clamp-2">
                      {group.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{group.member_count} members</span>
                </div>
                <div className="flex items-center gap-1">
                  <Hash className="w-4 h-4" />
                  <span>{group.channel_count} channels</span>
                </div>
              </div>

              <div className="flex items-center gap-1 mt-3 text-xs text-gray-400">
                <Calendar className="w-3 h-3" />
                <span>Created {formatDate(group.created_at)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateModal && (
        <CreateGroupModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleGroupCreated}
        />
      )}
    </div>
  );
}
