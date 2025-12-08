import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  MagnifyingGlassIcon,
  PlayIcon,
  StopIcon,
  ArrowPathIcon,
  TrashIcon,
  CubeIcon,
  CloudIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import apiClient from '@/api/client'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import { clsx } from 'clsx'

interface Deployment {
  id: string
  tenant_id: string
  tenant_name: string
  app_type: string
  namespace: string
  port: number
  status: 'pending' | 'deploying' | 'running' | 'stopped' | 'failed' | 'deleted'
  replicas: number
  cpu_request?: string
  memory_request?: string
  created_at: string
  updated_at: string
}

const statusConfig = {
  pending: { label: 'Pending', color: 'bg-gray-100 text-gray-800' },
  deploying: { label: 'Deploying', color: 'bg-blue-100 text-blue-800' },
  running: { label: 'Running', color: 'bg-green-100 text-green-800' },
  stopped: { label: 'Stopped', color: 'bg-yellow-100 text-yellow-800' },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-800' },
  deleted: { label: 'Deleted', color: 'bg-gray-100 text-gray-600' },
}

const appTypeConfig: Record<string, { label: string; color: string }> = {
  eucloud: { label: 'EUCloud', color: 'bg-blue-500' },
  eutype: { label: 'EUType', color: 'bg-purple-500' },
  eumail: { label: 'EUMail', color: 'bg-green-500' },
  eugroups: { label: 'EUGroups', color: 'bg-yellow-500' },
  dashboard: { label: 'Dashboard', color: 'bg-indigo-500' },
}

export default function DeploymentsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [appFilter, setAppFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 20

  const { data: deploymentsData, isLoading } = useQuery({
    queryKey: ['deployments', searchQuery, statusFilter, appFilter, currentPage],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (searchQuery) params.append('search', searchQuery)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (appFilter !== 'all') params.append('app_type', appFilter)
      params.append('skip', String((currentPage - 1) * pageSize))
      params.append('limit', String(pageSize))
      const { data } = await apiClient.get(`/deployments?${params}`)
      return data
    },
  })

  const actionMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: string }) => {
      return await apiClient.post(`/deployments/${id}/${action}`)
    },
    onSuccess: (_, { action }) => {
      toast.success(`Deployment ${action} initiated`)
      queryClient.invalidateQueries({ queryKey: ['deployments'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Action failed')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiClient.delete(`/deployments/${id}`)
    },
    onSuccess: () => {
      toast.success('Deployment deleted')
      queryClient.invalidateQueries({ queryKey: ['deployments'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to delete deployment')
    },
  })

  const deployments = deploymentsData?.items || deploymentsData || []
  const totalCount = deploymentsData?.total || deployments.length

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Deployments</h1>
        <p className="text-gray-500 mt-1">Manage all tenant application deployments</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CubeIcon className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Running</p>
              <p className="text-xl font-semibold text-gray-900">
                {deployments.filter((d: Deployment) => d.status === 'running').length}
              </p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CloudIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Deploying</p>
              <p className="text-xl font-semibold text-gray-900">
                {deployments.filter((d: Deployment) => d.status === 'deploying').length}
              </p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <StopIcon className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Stopped</p>
              <p className="text-xl font-semibold text-gray-900">
                {deployments.filter((d: Deployment) => d.status === 'stopped').length}
              </p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <CubeIcon className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Failed</p>
              <p className="text-xl font-semibold text-gray-900">
                {deployments.filter((d: Deployment) => d.status === 'failed').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by tenant or namespace..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10 w-full"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input w-36"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="deploying">Deploying</option>
          <option value="running">Running</option>
          <option value="stopped">Stopped</option>
          <option value="failed">Failed</option>
        </select>
        <select
          value={appFilter}
          onChange={(e) => setAppFilter(e.target.value)}
          className="input w-36"
        >
          <option value="all">All Apps</option>
          <option value="eucloud">EUCloud</option>
          <option value="eutype">EUType</option>
          <option value="eumail">EUMail</option>
          <option value="eugroups">EUGroups</option>
          <option value="dashboard">Dashboard</option>
        </select>
      </div>

      {/* Deployments table */}
      <div className="card overflow-hidden p-0">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                App
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tenant
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Namespace
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Port
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Replicas
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Resources
              </th>
              <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {deployments.map((deployment: Deployment) => {
              const status = statusConfig[deployment.status]
              const app = appTypeConfig[deployment.app_type] || {
                label: deployment.app_type,
                color: 'bg-gray-500',
              }
              return (
                <tr key={deployment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className={clsx('w-3 h-3 rounded-full', app.color)} />
                      <span className="font-medium text-gray-900">{app.label}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => navigate(`/tenants/${deployment.tenant_id}`)}
                      className="text-primary-600 hover:text-primary-700 font-medium"
                    >
                      {deployment.tenant_name}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-gray-600 font-mono text-sm">
                    {deployment.namespace}
                  </td>
                  <td className="px-6 py-4 text-gray-600">{deployment.port}</td>
                  <td className="px-6 py-4">
                    <span className={clsx('badge', status.color)}>{status.label}</span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{deployment.replicas}</td>
                  <td className="px-6 py-4 text-gray-500 text-sm">
                    {deployment.cpu_request && <span>{deployment.cpu_request} CPU</span>}
                    {deployment.memory_request && (
                      <span className="ml-2">{deployment.memory_request}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      {deployment.status === 'stopped' && (
                        <button
                          onClick={() => actionMutation.mutate({ id: deployment.id, action: 'start' })}
                          className="p-2 hover:bg-gray-100 rounded-lg"
                          title="Start"
                        >
                          <PlayIcon className="h-5 w-5 text-green-500" />
                        </button>
                      )}
                      {deployment.status === 'running' && (
                        <button
                          onClick={() => actionMutation.mutate({ id: deployment.id, action: 'stop' })}
                          className="p-2 hover:bg-gray-100 rounded-lg"
                          title="Stop"
                        >
                          <StopIcon className="h-5 w-5 text-yellow-500" />
                        </button>
                      )}
                      {['running', 'stopped', 'failed'].includes(deployment.status) && (
                        <button
                          onClick={() =>
                            actionMutation.mutate({ id: deployment.id, action: 'restart' })
                          }
                          className="p-2 hover:bg-gray-100 rounded-lg"
                          title="Restart"
                        >
                          <ArrowPathIcon className="h-5 w-5 text-blue-500" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this deployment?')) {
                            deleteMutation.mutate(deployment.id)
                          }
                        }}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                        title="Delete"
                      >
                        <TrashIcon className="h-5 w-5 text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {(currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, totalCount)} of {totalCount} deployments
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="btn btn-secondary"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage((p) => p + 1)}
              disabled={currentPage * pageSize >= totalCount}
              className="btn btn-secondary"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
