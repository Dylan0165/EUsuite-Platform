import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MagnifyingGlassIcon,
  PlusIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import apiClient from '@/api/client'
import LoadingSpinner from '@/components/common/LoadingSpinner'

interface User {
  id: number
  email: string
  first_name: string
  last_name: string
  role: string
  is_active: boolean
  created_at: string
  last_login: string | null
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetchUsers()
  }, [search, roleFilter])

  const fetchUsers = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (roleFilter) params.append('role', roleFilter)
      
      const response = await apiClient.get(`/users?${params.toString()}`)
      setUsers(response.data.users)
    } catch (error) {
      // Mock data for development
      setUsers([
        { id: 1, email: 'admin@company.com', first_name: 'Admin', last_name: 'User', role: 'admin', is_active: true, created_at: '2024-01-01', last_login: '2024-02-15' },
        { id: 2, email: 'john@company.com', first_name: 'John', last_name: 'Doe', role: 'manager', is_active: true, created_at: '2024-01-15', last_login: '2024-02-14' },
        { id: 3, email: 'jane@company.com', first_name: 'Jane', last_name: 'Smith', role: 'user', is_active: true, created_at: '2024-01-20', last_login: '2024-02-13' },
        { id: 4, email: 'bob@company.com', first_name: 'Bob', last_name: 'Wilson', role: 'user', is_active: false, created_at: '2024-01-25', last_login: null },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleExport = async () => {
    try {
      const response = await apiClient.get('/users/export', {
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'users.csv')
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success('Users exported successfully')
    } catch {
      toast.error('Failed to export users')
    }
  }

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'admin':
        return 'badge-error'
      case 'manager':
        return 'badge-warning'
      case 'user':
        return 'badge-info'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-500 mt-1">Manage organization members</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary"
        >
          <PlusIcon className="h-5 w-5" />
          Add User
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input pl-10"
            />
          </div>

          {/* Role filter */}
          <div className="flex gap-2">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="form-input"
            >
              <option value="">All Roles</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="user">User</option>
              <option value="viewer">Viewer</option>
            </select>

            <button onClick={handleExport} className="btn btn-outline">
              <ArrowDownTrayIcon className="h-5 w-5" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Users table */}
      <div className="card p-0">
        {isLoading ? (
          <div className="py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Last Login</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/users/${user.id}`)}
                  >
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium">
                          {user.first_name.charAt(0)}
                          {user.last_name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {user.first_name} {user.last_name}
                          </p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${getRoleBadgeClass(user.role)}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          user.is_active ? 'badge-success' : 'badge-error'
                        }`}
                      >
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="text-gray-500">
                      {user.last_login
                        ? new Date(user.last_login).toLocaleDateString()
                        : 'Never'}
                    </td>
                    <td className="text-gray-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/users/${user.id}`)
                        }}
                        className="text-sm font-medium hover:underline"
                        style={{ color: 'var(--brand-primary)' }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            fetchUsers()
          }}
        />
      )}
    </div>
  )
}

function CreateUserModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void
  onSuccess: () => void
}) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    role: 'user',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      await apiClient.post('/users', formData)
      toast.success('User created successfully')
      onSuccess()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to create user')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="text-lg font-semibold">Create User</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">First Name</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={formData.first_name}
                  onChange={(e) =>
                    setFormData({ ...formData, first_name: e.target.value })
                  }
                />
              </div>
              <div className="form-group">
                <label className="form-label">Last Name</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={formData.last_name}
                  onChange={(e) =>
                    setFormData({ ...formData, last_name: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                required
                className="form-input"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                required
                minLength={8}
                className="form-input"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
              />
            </div>

            <div className="form-group">
              <label className="form-label">Role</label>
              <select
                className="form-input"
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value })
                }
              >
                <option value="user">User</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-outline">
              Cancel
            </button>
            <button type="submit" disabled={isLoading} className="btn btn-primary">
              {isLoading ? <LoadingSpinner size="sm" /> : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
