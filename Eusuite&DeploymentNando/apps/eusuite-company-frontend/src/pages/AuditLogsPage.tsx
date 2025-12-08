import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline'
import apiClient from '@/api/client'
import LoadingSpinner from '@/components/common/LoadingSpinner'

interface AuditLog {
  id: number
  user_id: number | null
  action: string
  resource_type: string
  resource_id: string | null
  details: Record<string, any>
  ip_address: string | null
  status: string
  created_at: string
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    fetchLogs()
  }, [page, search, actionFilter])

  const fetchLogs = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: '20',
      })
      if (search) params.append('search', search)
      if (actionFilter) params.append('action', actionFilter)

      const response = await apiClient.get(`/audit?${params.toString()}`)
      setLogs(response.data.logs)
      setTotalPages(response.data.total_pages)
    } catch {
      // Mock data
      setLogs([
        { id: 1, user_id: 1, action: 'user.create', resource_type: 'user', resource_id: '2', details: { email: 'john@company.com' }, ip_address: '192.168.1.1', status: 'success', created_at: '2024-02-15T10:30:00Z' },
        { id: 2, user_id: 1, action: 'user.update', resource_type: 'user', resource_id: '2', details: { field: 'role', old: 'user', new: 'manager' }, ip_address: '192.168.1.1', status: 'success', created_at: '2024-02-15T10:25:00Z' },
        { id: 3, user_id: 1, action: 'deployment.create', resource_type: 'deployment', resource_id: 'eucloud', details: { app: 'eucloud' }, ip_address: '192.168.1.1', status: 'success', created_at: '2024-02-15T10:20:00Z' },
        { id: 4, user_id: 2, action: 'login', resource_type: 'session', resource_id: null, details: {}, ip_address: '192.168.1.50', status: 'success', created_at: '2024-02-15T09:00:00Z' },
        { id: 5, user_id: null, action: 'login', resource_type: 'session', resource_id: null, details: { email: 'unknown@test.com' }, ip_address: '10.0.0.1', status: 'failed', created_at: '2024-02-15T08:45:00Z' },
        { id: 6, user_id: 1, action: 'branding.update', resource_type: 'branding', resource_id: '1', details: { primary_color: '#1e5631' }, ip_address: '192.168.1.1', status: 'success', created_at: '2024-02-14T16:00:00Z' },
        { id: 7, user_id: 1, action: 'storage_policy.create', resource_type: 'storage_policy', resource_id: '2', details: { name: 'Power User' }, ip_address: '192.168.1.1', status: 'success', created_at: '2024-02-14T15:30:00Z' },
      ])
      setTotalPages(3)
    } finally {
      setIsLoading(false)
    }
  }

  const getActionBadgeClass = (action: string) => {
    if (action.includes('create')) return 'badge-success'
    if (action.includes('delete')) return 'badge-error'
    if (action.includes('update')) return 'badge-warning'
    if (action === 'login') return 'badge-info'
    return 'bg-gray-100 text-gray-800'
  }

  const formatAction = (action: string) => {
    return action
      .replace('.', ' ')
      .replace('_', ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase())
  }

  const actionOptions = [
    'login',
    'user.create',
    'user.update',
    'user.delete',
    'deployment.create',
    'deployment.delete',
    'branding.update',
    'storage_policy.create',
    'storage_policy.update',
    'settings.update',
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
        <p className="text-gray-500 mt-1">Track all actions in your organization</p>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by user, resource, or details..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input pl-10"
            />
          </div>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="form-input w-48"
          >
            <option value="">All Actions</option>
            {actionOptions.map((action) => (
              <option key={action} value={action}>
                {formatAction(action)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Logs table */}
      <div className="card p-0">
        {isLoading ? (
          <div className="py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-gray-500">No audit logs found</div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Action</th>
                  <th>Resource</th>
                  <th>User</th>
                  <th>IP Address</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="text-gray-500">
                      {format(new Date(log.created_at), 'MMM d, HH:mm:ss')}
                    </td>
                    <td>
                      <span className={`badge ${getActionBadgeClass(log.action)}`}>
                        {formatAction(log.action)}
                      </span>
                    </td>
                    <td>
                      <div>
                        <p className="font-medium text-gray-900">
                          {log.resource_type}
                        </p>
                        {log.resource_id && (
                          <p className="text-xs text-gray-500">ID: {log.resource_id}</p>
                        )}
                      </div>
                    </td>
                    <td>
                      {log.user_id ? (
                        <span className="text-gray-900">User #{log.user_id}</span>
                      ) : (
                        <span className="text-gray-400">System</span>
                      )}
                    </td>
                    <td className="text-gray-500 font-mono text-xs">
                      {log.ip_address || '-'}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          log.status === 'success' ? 'badge-success' : 'badge-error'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="btn btn-outline"
            >
              Previous
            </button>
            <span className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
              className="btn btn-outline"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
