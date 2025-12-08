import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  KeyIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import apiClient from '@/api/client'
import LoadingSpinner from '@/components/common/LoadingSpinner'

interface User {
  id: number
  email: string
  first_name: string
  last_name: string
  phone: string | null
  role: string
  is_active: boolean
  is_verified: boolean
  storage_quota_bytes: number | null
  storage_used_bytes: number
  created_at: string
  last_login: string | null
}

export default function UserDetailPage() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<Partial<User>>({})

  useEffect(() => {
    fetchUser()
  }, [userId])

  const fetchUser = async () => {
    setIsLoading(true)
    try {
      const response = await apiClient.get(`/users/${userId}`)
      setUser(response.data)
      setEditData(response.data)
    } catch {
      // Mock data
      setUser({
        id: 1,
        email: 'john@company.com',
        first_name: 'John',
        last_name: 'Doe',
        phone: '+31 6 12345678',
        role: 'user',
        is_active: true,
        is_verified: true,
        storage_quota_bytes: 5368709120,
        storage_used_bytes: 2147483648,
        created_at: '2024-01-15T10:30:00Z',
        last_login: '2024-02-14T14:20:00Z',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      await apiClient.put(`/users/${userId}`, editData)
      toast.success('User updated successfully')
      setIsEditing(false)
      fetchUser()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to update user')
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this user?')) return

    try {
      await apiClient.delete(`/users/${userId}`)
      toast.success('User deleted successfully')
      navigate('/users')
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to delete user')
    }
  }

  const handleResetPassword = async () => {
    if (!confirm('Send password reset email to this user?')) return

    try {
      await apiClient.post(`/users/${userId}/reset-password`)
      toast.success('Password reset email sent')
    } catch {
      toast.error('Failed to send password reset')
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">User not found</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/users')}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            {user.first_name} {user.last_name}
          </h1>
          <p className="text-gray-500">{user.email}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="btn btn-outline"
          >
            <PencilIcon className="h-4 w-4" />
            {isEditing ? 'Cancel' : 'Edit'}
          </button>
          <button onClick={handleDelete} className="btn btn-danger">
            <TrashIcon className="h-4 w-4" />
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h2 className="card-title mb-4">User Information</h2>

            {isEditing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label">First Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editData.first_name || ''}
                      onChange={(e) =>
                        setEditData({ ...editData, first_name: e.target.value })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editData.last_name || ''}
                      onChange={(e) =>
                        setEditData({ ...editData, last_name: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input
                    type="tel"
                    className="form-input"
                    value={editData.phone || ''}
                    onChange={(e) =>
                      setEditData({ ...editData, phone: e.target.value })
                    }
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select
                    className="form-input"
                    value={editData.role}
                    onChange={(e) =>
                      setEditData({ ...editData, role: e.target.value })
                    }
                  >
                    <option value="user">User</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editData.is_active}
                      onChange={(e) =>
                        setEditData({ ...editData, is_active: e.target.checked })
                      }
                    />
                    <span className="text-sm">Active</span>
                  </label>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="btn btn-outline"
                  >
                    Cancel
                  </button>
                  <button onClick={handleSave} className="btn btn-primary">
                    Save Changes
                  </button>
                </div>
              </div>
            ) : (
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-gray-500">Full Name</dt>
                  <dd className="font-medium">
                    {user.first_name} {user.last_name}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Email</dt>
                  <dd className="font-medium">{user.email}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Phone</dt>
                  <dd className="font-medium">{user.phone || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Role</dt>
                  <dd>
                    <span className="badge badge-info">{user.role}</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Status</dt>
                  <dd>
                    <span
                      className={`badge ${
                        user.is_active ? 'badge-success' : 'badge-error'
                      }`}
                    >
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Verified</dt>
                  <dd>
                    <span
                      className={`badge ${
                        user.is_verified ? 'badge-success' : 'badge-warning'
                      }`}
                    >
                      {user.is_verified ? 'Yes' : 'No'}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Created</dt>
                  <dd className="font-medium">
                    {new Date(user.created_at).toLocaleDateString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Last Login</dt>
                  <dd className="font-medium">
                    {user.last_login
                      ? new Date(user.last_login).toLocaleString()
                      : 'Never'}
                  </dd>
                </div>
              </dl>
            )}
          </div>

          {/* Storage */}
          <div className="card">
            <h2 className="card-title mb-4">Storage</h2>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Used</span>
                <span className="font-medium">
                  {formatBytes(user.storage_used_bytes)} /{' '}
                  {user.storage_quota_bytes
                    ? formatBytes(user.storage_quota_bytes)
                    : 'Unlimited'}
                </span>
              </div>
              {user.storage_quota_bytes && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${Math.min(
                        (user.storage_used_bytes / user.storage_quota_bytes) * 100,
                        100
                      )}%`,
                      backgroundColor: 'var(--brand-primary)',
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions sidebar */}
        <div className="space-y-6">
          <div className="card">
            <h2 className="card-title mb-4">Actions</h2>
            <div className="space-y-2">
              <button
                onClick={handleResetPassword}
                className="btn btn-outline w-full justify-start"
              >
                <KeyIcon className="h-4 w-4" />
                Reset Password
              </button>
            </div>
          </div>

          <div className="card">
            <h2 className="card-title mb-4">App Permissions</h2>
            <div className="space-y-2">
              {['EUCloud', 'EUMail', 'EUGroups', 'EUType'].map((app) => (
                <label key={app} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className="text-sm">{app}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
