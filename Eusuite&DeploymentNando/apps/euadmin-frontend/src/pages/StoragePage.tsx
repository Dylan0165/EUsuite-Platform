import { useState, useEffect } from 'react';
import { HardDrive, Users, TrendingUp, Database, RefreshCw } from 'lucide-react';
import { adminApi, User, UserStorage } from '../api/client';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface UserWithStorage extends User {
  storage?: UserStorage;
}

export default function StoragePage() {
  const [users, setUsers] = useState<UserWithStorage[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalStorage, setTotalStorage] = useState<any>(null);

  useEffect(() => {
    loadStorageData();
  }, []);

  const loadStorageData = async () => {
    try {
      setLoading(true);
      const [usersResponse, storageResponse] = await Promise.all([
        adminApi.getUsers(),
        adminApi.getSystemStorage(),
      ]);

      setTotalStorage(storageResponse.total_storage);

      // Load storage for each user (limit to first 20 for performance)
      const usersWithStorage = await Promise.all(
        usersResponse.users.slice(0, 20).map(async (user) => {
          try {
            const storage = await adminApi.getUserStorage(user.user_id);
            return { ...user, storage };
          } catch {
            return { ...user, storage: undefined };
          }
        })
      );

      // Sort by storage used
      usersWithStorage.sort((a, b) => 
        (b.storage?.total_bytes || 0) - (a.storage?.total_bytes || 0)
      );

      setUsers(usersWithStorage);
    } catch (err) {
      console.error('Failed to load storage data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetStorage = async (user: UserWithStorage) => {
    if (!confirm(`Delete ALL files for user "${user.username}"?`)) return;
    try {
      await adminApi.resetUserStorage(user.user_id);
      loadStorageData();
    } catch {
      alert('Failed to reset storage');
    }
  };

  const storageByUserData = users
    .filter((u) => u.storage && u.storage.total_mb > 0)
    .slice(0, 8)
    .map((u) => ({
      name: u.username.slice(0, 10),
      storage: u.storage?.total_mb || 0,
    }));

  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#22c55e', '#06b6d4'];

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
          <h1 className="text-2xl font-bold text-gray-900">Storage Usage</h1>
          <p className="text-gray-500">Monitor storage usage per user</p>
        </div>
        <button onClick={loadStorageData} className="btn-secondary flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="admin-stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Storage</p>
              <p className="text-3xl font-bold text-gray-900">
                {totalStorage?.total_gb?.toFixed(2) || 0} GB
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Database className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Files</p>
              <p className="text-3xl font-bold text-gray-900">{totalStorage?.total_files || 0}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <HardDrive className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Users with Files</p>
              <p className="text-3xl font-bold text-gray-900">{totalStorage?.users_with_files || 0}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Avg per User</p>
              <p className="text-3xl font-bold text-gray-900">
                {totalStorage?.users_with_files > 0
                  ? ((totalStorage?.total_mb || 0) / totalStorage?.users_with_files).toFixed(1)
                  : 0}{' '}
                MB
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Storage by User Chart */}
        <div className="admin-card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Storage by User (MB)</h3>
          <div className="h-64">
            {storageByUserData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={storageByUserData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="storage" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                No storage data available
              </div>
            )}
          </div>
        </div>

        {/* Top Users Pie */}
        <div className="admin-card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Storage Users</h3>
          <div className="h-64">
            {storageByUserData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={storageByUserData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="storage"
                    label={(entry) => entry.name}
                  >
                    {storageByUserData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                No storage data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="admin-card overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">All Users Storage</h3>
        </div>
        <table className="admin-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Files</th>
              <th>Storage (MB)</th>
              <th>Storage (GB)</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.user_id}>
                <td>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                      style={{ backgroundColor: user.avatar_color || '#3b82f6' }}
                    >
                      {user.username.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="font-medium">{user.username}</span>
                  </div>
                </td>
                <td>{user.storage?.total_files || 0}</td>
                <td>{user.storage?.total_mb?.toFixed(2) || 0}</td>
                <td>{user.storage?.total_gb?.toFixed(4) || 0}</td>
                <td>
                  <button
                    onClick={() => handleResetStorage(user)}
                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                  >
                    Reset Storage
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
