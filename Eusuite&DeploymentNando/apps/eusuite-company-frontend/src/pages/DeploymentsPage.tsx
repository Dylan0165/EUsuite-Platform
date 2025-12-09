import { useState, useEffect } from 'react'
import {
  CloudIcon,
  ArrowPathIcon,
  TrashIcon,
  PlusIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import apiClient from '@/api/client'
import LoadingSpinner from '@/components/common/LoadingSpinner'

interface Deployment {
  id: number
  app_type: string
  namespace: string
  status: 'pending' | 'deploying' | 'running' | 'stopped' | 'failed' | 'updating'
  node_port: number
  replicas: number
  ready_replicas: number
  internal_url: string | null
  external_url: string | null
  created_at: string
  last_deployed_at: string | null
}

const APP_TYPES = [
  { id: 'dashboard', name: 'Dashboard', description: 'Central hub for all EUSuite apps', icon: '🏠' },
  { id: 'eucloud', name: 'EUCloud', description: 'File storage and sharing', icon: '☁️' },
  { id: 'eumail', name: 'EUMail', description: 'Email communication', icon: '📧' },
  { id: 'eugroups', name: 'EUGroups', description: 'Team collaboration', icon: '👥' },
  { id: 'eutype', name: 'EUType', description: 'Document editing', icon: '📝' },
]

export default function DeploymentsPage() {
  const [deployments, setDeployments] = useState<Deployment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showDeployModal, setShowDeployModal] = useState(false)

  useEffect(() => {
    fetchDeployments()
  }, [])

  const fetchDeployments = async () => {
    setIsLoading(true)
    try {
      const response = await apiClient.get('/deployments')
      setDeployments(response.data.deployments)
    } catch {
      // Mock data
      setDeployments([
        { id: 1, app_type: 'dashboard', namespace: 'company-123', status: 'running', node_port: 30091, replicas: 1, ready_replicas: 1, internal_url: 'http://dashboard.company-123.svc', external_url: null, created_at: '2024-01-01', last_deployed_at: '2024-02-01' },
        { id: 2, app_type: 'eucloud', namespace: 'company-123', status: 'running', node_port: 30080, replicas: 2, ready_replicas: 2, internal_url: 'http://eucloud.company-123.svc', external_url: null, created_at: '2024-01-01', last_deployed_at: '2024-02-01' },
        { id: 3, app_type: 'eumail', namespace: 'company-123', status: 'running', node_port: 30082, replicas: 1, ready_replicas: 1, internal_url: 'http://eumail.company-123.svc', external_url: null, created_at: '2024-01-01', last_deployed_at: '2024-02-01' },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleAction = async (
    _deploymentId: number,
    appType: string,
    action: 'restart' | 'stop' | 'delete'
  ) => {
    const actionMessages = {
      restart: 'Restarting...',
      stop: 'Stopping...',
      delete: 'Deleting...',
    }

    toast.loading(actionMessages[action])

    try {
      if (action === 'restart') {
        await apiClient.post(`/deployments/${appType}/restart`)
        toast.success('Deployment restarted')
      } else if (action === 'delete') {
        if (!confirm(`Are you sure you want to delete ${appType}?`)) return
        await apiClient.delete(`/deployments/${appType}`)
        toast.success('Deployment deleted')
      }
      fetchDeployments()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || `Failed to ${action}`)
    }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      running: 'badge-success',
      deploying: 'badge-warning',
      updating: 'badge-warning',
      pending: 'badge-info',
      stopped: 'bg-gray-100 text-gray-800',
      failed: 'badge-error',
    }
    return styles[status] || 'bg-gray-100 text-gray-800'
  }

  const getAppInfo = (appType: string) => {
    return APP_TYPES.find((a) => a.id === appType) || { name: appType, icon: '📦', description: '' }
  }

  const deployedApps = deployments.map((d) => d.app_type)
  const availableApps = APP_TYPES.filter((a) => !deployedApps.includes(a.id))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Deployments</h1>
          <p className="text-gray-500 mt-1">Manage your EUSuite applications</p>
        </div>
        {availableApps.length > 0 && (
          <button
            onClick={() => setShowDeployModal(true)}
            className="btn btn-primary"
          >
            <PlusIcon className="h-5 w-5" />
            Deploy App
          </button>
        )}
      </div>

      {/* Deployments list */}
      {isLoading ? (
        <div className="py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : deployments.length === 0 ? (
        <div className="card text-center py-12">
          <CloudIcon className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No deployments yet</h3>
          <p className="text-gray-500 mb-4">
            Deploy your first EUSuite application to get started
          </p>
          <button
            onClick={() => setShowDeployModal(true)}
            className="btn btn-primary"
          >
            Deploy App
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {deployments.map((deployment) => {
            const appInfo = getAppInfo(deployment.app_type)
            return (
              <div key={deployment.id} className="card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-3xl">{appInfo.icon}</div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{appInfo.name}</h3>
                      <p className="text-sm text-gray-500">{appInfo.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className={`badge ${getStatusBadge(deployment.status)}`}>
                      {deployment.status}
                    </span>

                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          handleAction(deployment.id, deployment.app_type, 'restart')
                        }
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                        title="Restart"
                      >
                        <ArrowPathIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() =>
                          handleAction(deployment.id, deployment.app_type, 'delete')
                        }
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded"
                        title="Delete"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Port:</span>
                    <span className="ml-2 font-medium">{deployment.node_port}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Replicas:</span>
                    <span className="ml-2 font-medium">
                      {deployment.ready_replicas}/{deployment.replicas}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Namespace:</span>
                    <span className="ml-2 font-mono text-xs">{deployment.namespace}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Last deployed:</span>
                    <span className="ml-2">
                      {deployment.last_deployed_at
                        ? new Date(deployment.last_deployed_at).toLocaleDateString()
                        : '-'}
                    </span>
                  </div>
                </div>

                {deployment.internal_url && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <span className="text-sm text-gray-500">Internal URL:</span>
                    <code className="ml-2 text-sm bg-gray-100 px-2 py-1 rounded">
                      {deployment.internal_url}
                    </code>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Deploy modal */}
      {showDeployModal && (
        <DeployModal
          availableApps={availableApps}
          onClose={() => setShowDeployModal(false)}
          onSuccess={() => {
            setShowDeployModal(false)
            fetchDeployments()
          }}
        />
      )}
    </div>
  )
}

function DeployModal({
  availableApps,
  onClose,
  onSuccess,
}: {
  availableApps: typeof APP_TYPES
  onClose: () => void
  onSuccess: () => void
}) {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedApp, setSelectedApp] = useState('')
  const [replicas, setReplicas] = useState(1)

  const handleDeploy = async () => {
    if (!selectedApp) return

    setIsLoading(true)
    try {
      await apiClient.post('/deployments', {
        app_type: selectedApp,
        replicas,
      })
      toast.success('Deployment started')
      onSuccess()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to deploy')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="text-lg font-semibold">Deploy Application</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ×
          </button>
        </div>

        <div className="modal-body space-y-4">
          <div className="form-group">
            <label className="form-label">Select Application</label>
            <div className="space-y-2 mt-2">
              {availableApps.map((app) => (
                <label
                  key={app.id}
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedApp === app.id
                      ? 'border-brand-primary bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="app"
                    value={app.id}
                    checked={selectedApp === app.id}
                    onChange={() => setSelectedApp(app.id)}
                    className="sr-only"
                  />
                  <span className="text-2xl">{app.icon}</span>
                  <div>
                    <p className="font-medium">{app.name}</p>
                    <p className="text-sm text-gray-500">{app.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Replicas</label>
            <input
              type="number"
              min={1}
              max={5}
              value={replicas}
              onChange={(e) => setReplicas(parseInt(e.target.value) || 1)}
              className="form-input w-24"
            />
            <p className="text-xs text-gray-500 mt-1">
              Number of instances to run (1-5)
            </p>
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-outline">
            Cancel
          </button>
          <button
            onClick={handleDeploy}
            disabled={!selectedApp || isLoading}
            className="btn btn-primary"
          >
            {isLoading ? <LoadingSpinner size="sm" /> : 'Deploy'}
          </button>
        </div>
      </div>
    </div>
  )
}
