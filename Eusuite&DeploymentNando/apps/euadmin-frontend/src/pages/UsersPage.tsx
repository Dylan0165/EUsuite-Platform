import { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Trash2,
  Ban,
  CheckCircle,
  HardDrive,
  MoreVertical,
  Eye,
  RefreshCw,
  LogOut,
  X,
} from 'lucide-react';
import { adminApi, User, UserStorage, UserActivity } from '../api/client';
import { format } from 'date-fns';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userStorage, setUserStorage] = useState<UserStorage | null>(null);
  const [userActivity, setUserActivity] = useState<UserActivity[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getUsers();
      setUsers(response.users);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadUserDetails = async (user: User) => {
    setSelectedUser(user);
    setShowDetails(true);
    try {
      const [storage, activity] = await Promise.all([
        adminApi.getUserStorage(user.user_id),
        adminApi.getUserActivity(user.user_id),
      ]);
      setUserStorage(storage);
      setUserActivity(activity.activities);
    } catch (err) {
      console.error('Failed to load user details:', err);
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!confirm(`Are you sure you want to DELETE user "${user.username}"? This cannot be undone!`)) {
      return;
    }
    setActionLoading(true);
    try {
      await adminApi.deleteUser(user.user_id);
      setUsers((prev) => prev.filter((u) => u.user_id !== user.user_id));
      setShowDetails(false);
      alert('User deleted successfully');
    } catch (err) {
      alert('Failed to delete user');
    } finally {
      setActionLoading(false);
      setActiveMenu(null);
    }
  };

  const handleBlockUser = async (user: User) => {
    setActionLoading(true);
    try {
      if (user.is_active) {
        await adminApi.blockUser(user.user_id);
      } else {
        await adminApi.unblockUser(user.user_id);
      }
      setUsers((prev) =>
        prev.map((u) =>
          u.user_id === user.user_id ? { ...u, is_active: !u.is_active } : u
        )
      );
    } catch (err) {
      alert('Failed to update user status');
    } finally {
      setActionLoading(false);
      setActiveMenu(null);
    }
  };

  const handleResetStorage = async (user: User) => {
    if (!confirm(`Are you sure you want to DELETE ALL FILES for user "${user.username}"?`)) {
      return;
    }
    setActionLoading(true);
    try {
      await adminApi.resetUserStorage(user.user_id);
      alert('User storage reset successfully');
      if (selectedUser?.user_id === user.user_id) {
        const storage = await adminApi.getUserStorage(user.user_id);
        setUserStorage(storage);
      }
    } catch (err) {
      alert('Failed to reset storage');
    } finally {
      setActionLoading(false);
      setActiveMenu(null);
    }
  };

  const handleForceLogout = async (user: User) => {
    setActionLoading(true);
    try {
      await adminApi.forceLogoutUser(user.user_id);
      alert('Force logout signal sent');
    } catch (err) {
      alert('Failed to force logout');
    } finally {
      setActionLoading(false);
      setActiveMenu(null);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return format(new Date(dateString), 'MMM d, yyyy HH:mm');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-500">Manage all users in the system</p>
        </div>
        <button onClick={loadUsers} className="btn-secondary flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search users by name or email..."
          className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* Users Table */}
      <div className="admin-card overflow-hidden">
        <table className="admin-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Storage</th>
              <th>Files</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.user_id}>
                <td>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium"
                      style={{ backgroundColor: user.avatar_color || '#3b82f6' }}
                    >
                      {user.username.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{user.username}</p>
                      <p className="text-xs text-gray-500">ID: {user.user_id}</p>
                    </div>
                  </div>
                </td>
                <td className="text-gray-600">{user.email || '-'}</td>
                <td>
                  <div className="text-sm">
                    <p className="font-medium text-gray-900">
                      {((user as any).actual_storage_mb || 0).toFixed(2)} MB
                    </p>
                    <p className="text-xs text-gray-500">
                      / {((user as any).storage_quota_gb || 5).toFixed(1)} GB
                    </p>
                  </div>
                </td>
                <td className="text-gray-600">{(user as any).file_count || 0}</td>
                <td>
                  {user.is_active ? (
                    <span className="badge badge-success">Active</span>
                  ) : (
                    <span className="badge badge-danger">Blocked</span>
                  )}
                </td>
                <td className="text-gray-600 text-sm">{formatDate(user.created_at)}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => loadUserDetails(user)}
                      className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <div className="relative">
                      <button
                        onClick={() => setActiveMenu(activeMenu === user.user_id ? null : user.user_id)}
                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {activeMenu === user.user_id && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                          <button
                            onClick={() => handleBlockUser(user)}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                          >
                            {user.is_active ? (
                              <>
                                <Ban className="w-4 h-4 text-red-500" />
                                <span>Block User</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                <span>Unblock User</span>
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleResetStorage(user)}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                          >
                            <HardDrive className="w-4 h-4 text-orange-500" />
                            <span>Reset Storage</span>
                          </button>
                          <button
                            onClick={() => handleForceLogout(user)}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                          >
                            <LogOut className="w-4 h-4 text-blue-500" />
                            <span>Force Logout</span>
                          </button>
                          <hr className="my-1" />
                          <button
                            onClick={() => handleDeleteUser(user)}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Delete User</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredUsers.length === 0 && (
          <div className="p-12 text-center text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No users found</p>
          </div>
        )}
      </div>

      {/* User Details Modal */}
      {showDetails && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-medium"
                  style={{ backgroundColor: selectedUser.avatar_color || '#3b82f6' }}
                >
                  {selectedUser.username.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{selectedUser.username}</h2>
                  <p className="text-gray-500">{selectedUser.email}</p>
                </div>
              </div>
              <button
                onClick={() => setShowDetails(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Storage Info */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Storage Usage</h3>
                {userStorage ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-500">Total Files</p>
                      <p className="text-2xl font-bold text-gray-900">{userStorage.total_files}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-500">Storage Used</p>
                      <p className="text-2xl font-bold text-gray-900">{userStorage.total_mb.toFixed(2)} MB</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 col-span-2">
                      <p className="text-sm text-gray-500 mb-2">By Type</p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(userStorage.storage_by_type).map(([type, data]) => (
                          <span key={type} className="badge badge-info">
                            {type}: {data.count} files
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="animate-pulse bg-gray-100 h-24 rounded-lg"></div>
                )}
              </div>

              {/* Recent Activity */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                {userActivity.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {userActivity.map((activity, index) => (
                      <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{activity.action}</p>
                          <p className="text-sm text-gray-500">{activity.detail}</p>
                        </div>
                        <span className="text-xs text-gray-400">
                          {activity.timestamp ? formatDate(activity.timestamp) : 'Unknown'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No recent activity</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={() => handleBlockUser(selectedUser)}
                  disabled={actionLoading}
                  className={selectedUser.is_active ? 'btn-secondary' : 'btn-success'}
                >
                  {selectedUser.is_active ? 'Block User' : 'Unblock User'}
                </button>
                <button
                  onClick={() => handleResetStorage(selectedUser)}
                  disabled={actionLoading}
                  className="btn-secondary"
                >
                  Reset Storage
                </button>
                <button
                  onClick={() => handleDeleteUser(selectedUser)}
                  disabled={actionLoading}
                  className="btn-danger"
                >
                  Delete User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
