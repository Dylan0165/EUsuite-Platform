import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CloudIcon,
  ServerIcon,
  TrashIcon,
  ArrowPathIcon,
  CubeIcon,
  PlusIcon,
  CpuChipIcon,
  CircleStackIcon,
  ArrowTopRightOnSquareIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import apiClient from '@/api/client'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import clsx from 'clsx'

// Types
interface CompanyDeployment {
  name: string
  app_type: string
  status: string
  replicas: number
  ready_replicas: number
  node_port: number | null
  internal_url: string
  external_url: string | null
  age: string
  images: string[]
}

interface CompanyPod {
  name: string
  app_type: string
  status: string
  ready: string
  restarts: number
  age: string
  ip: string
}

interface CompanyPVC {
  name: string
  app_type: string
  status: string
  capacity: string
  access_modes: string[]
  storage_class: string
}

interface CompanyHPA {
  name: string
  app_type: string
  min_replicas: number
  max_replicas: number
  current_replicas: number
  cpu_target: number
  cpu_current: number | null
}

interface ResourceUsage {
  app_type: string
  cpu: string
  memory: string
  cpu_percent?: number
  memory_percent?: number
}

// Available EUSUITE apps
const EUSUITE_APPS = [
  { id: 'eusuite-login', name: 'EUSuite Login', description: 'SSO Login Portal', icon: '🔐', port: 30090 },
  { id: 'eusuite-dashboard', name: 'Dashboard', description: 'Central Hub', icon: '🏠', port: 30091 },
  { id: 'eucloud-frontend', name: 'EUCloud', description: 'File Storage', icon: '☁️', port: 30080 },
  { id: 'eucloud-backend', name: 'EUCloud API', description: 'Cloud Backend', icon: '⚙️', port: 30081 },
  { id: 'eumail-frontend', name: 'EUMail', description: 'Email Client', icon: '📧', port: 30082 },
  { id: 'eumail-backend', name: 'EUMail API', description: 'Email Backend', icon: '⚙️', port: 30083 },
  { id: 'eutype-frontend', name: 'EUType', description: 'Document Editor', icon: '📝', port: 30084 },
  { id: 'eugroups-frontend', name: 'EUGroups', description: 'Team Collaboration', icon: '👥', port: 30085 },
  { id: 'eugroups-backend', name: 'EUGroups API', description: 'Groups Backend', icon: '⚙️', port: 30086 },
  { id: 'euadmin-frontend', name: 'EUAdmin', description: 'Admin Panel', icon: '🛠️', port: 30092 },
  { id: 'euadmin-backend', name: 'EUAdmin API', description: 'Admin Backend', icon: '⚙️', port: 30093 },
]

const statusColors: Record<string, string> = {
  Running: 'text-green-600 bg-green-100',
  Pending: 'text-yellow-600 bg-yellow-100',
  Failed: 'text-red-600 bg-red-100',
  Healthy: 'text-green-600 bg-green-100',
  Degraded: 'text-yellow-600 bg-yellow-100',
  Bound: 'text-green-600 bg-green-100',
}

export default function KubernetesCompanyPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'apps' | 'pods' | 'storage' | 'scaling' | 'metrics'>('apps')
  const [showDeployModal, setShowDeployModal] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)

  // Deployments Query
  const { data: deployments = [], isLoading: deploymentsLoading } = useQuery<CompanyDeployment[]>({
    queryKey: ['company-deployments'],
    queryFn: async () => {
      const { data } = await apiClient.get('/kubernetes/deployments')
      return data
    },
    refetchInterval: autoRefresh ? 10000 : false,
  })

  // Pods Query
  const { data: pods = [], isLoading: podsLoading } = useQuery<CompanyPod[]>({
    queryKey: ['company-pods'],
    queryFn: async () => {
      const { data } = await apiClient.get('/kubernetes/pods')
      return data
    },
    refetchInterval: autoRefresh ? 5000 : false,
    enabled: activeTab === 'apps' || activeTab === 'pods',
  })

  // PVCs Query
  const { data: pvcs = [], isLoading: pvcsLoading } = useQuery<CompanyPVC[]>({
    queryKey: ['company-pvcs'],
    queryFn: async () => {
      const { data } = await apiClient.get('/kubernetes/storage')
      return data
    },
    enabled: activeTab === 'storage',
  })

  // HPA Query
  const { data: hpas = [], isLoading: hpasLoading } = useQuery<CompanyHPA[]>({
    queryKey: ['company-hpas'],
    queryFn: async () => {
      const { data } = await apiClient.get('/kubernetes/autoscaling')
      return data
    },
    enabled: activeTab === 'scaling',
  })

  // Metrics Query
  const { data: metrics = [], isLoading: metricsLoading } = useQuery<ResourceUsage[]>({
    queryKey: ['company-metrics'],
    queryFn: async () => {
      const { data } = await apiClient.get('/kubernetes/metrics')
      return data
    },
    refetchInterval: autoRefresh ? 5000 : false,
    enabled: activeTab === 'metrics',
  })

  // Deploy App Mutation
  const deployMutation = useMutation({
    mutationFn: async (appType: string) => {
      return await apiClient.post(`/kubernetes/deploy/${appType}`)
    },
    onSuccess: (_data: unknown, appType: string) => {
      toast.success(`${appType} deployment started`)
      queryClient.invalidateQueries({ queryKey: ['company-deployments'] })
      queryClient.invalidateQueries({ queryKey: ['company-pods'] })
      setShowDeployModal(false)
    },
    onError: (error: Error & { response?: { data?: { detail?: string } } }) => {
      toast.error(error.response?.data?.detail || 'Deployment failed')
    },
  })

  // App Actions
  const appActionMutation = useMutation({
    mutationFn: async ({ appType, action }: { appType: string; action: string }) => {
      return await apiClient.post(`/kubernetes/${appType}/${action}`)
    },
    onSuccess: (_data: unknown, { appType, action }: { appType: string; action: string }) => {
      toast.success(`${appType} ${action} successful`)
      queryClient.invalidateQueries({ queryKey: ['company-deployments'] })
      queryClient.invalidateQueries({ queryKey: ['company-pods'] })
    },
    onError: (error: Error & { response?: { data?: { detail?: string } } }) => {
      toast.error(error.response?.data?.detail || 'Action failed')
    },
  })

  // Delete Deployment
  const deleteMutation = useMutation({
    mutationFn: async (appType: string) => {
      return await apiClient.delete(`/kubernetes/deployments/${appType}`)
    },
    onSuccess: (_data: unknown, appType: string) => {
      toast.success(`${appType} deleted`)
      queryClient.invalidateQueries({ queryKey: ['company-deployments'] })
      queryClient.invalidateQueries({ queryKey: ['company-pods'] })
    },
    onError: (error: Error & { response?: { data?: { detail?: string } } }) => {
      toast.error(error.response?.data?.detail || 'Delete failed')
    },
  })

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ['company-deployments'] })
    queryClient.invalidateQueries({ queryKey: ['company-pods'] })
    queryClient.invalidateQueries({ queryKey: ['company-pvcs'] })
    queryClient.invalidateQueries({ queryKey: ['company-metrics'] })
    toast.success('Data refreshed')
  }

  const deployedApps = deployments.map((d: CompanyDeployment) => d.app_type)
  const availableApps = EUSUITE_APPS.filter(a => !deployedApps.includes(a.id))
  
  const runningDeployments = deployments.filter((d: CompanyDeployment) => d.ready_replicas > 0)
  const totalPods = pods.length
  const runningPods = pods.filter((p: CompanyPod) => p.status === 'Running').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kubernetes Resources</h1>
          <p className="text-gray-500 mt-1">Manage your EUSuite application deployments</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300"
            />
            Auto-refresh
          </label>
          <button onClick={refreshAll} className="btn btn-secondary">
            <ArrowPathIcon className="h-5 w-5" />
            Refresh
          </button>
          {availableApps.length > 0 && (
            <button onClick={() => setShowDeployModal(true)} className="btn btn-primary">
              <PlusIcon className="h-5 w-5" />
              Deploy App
            </button>
          )}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ServerIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Deployments</p>
              <p className="text-xl font-semibold text-gray-900">{deployments.length}</p>
              <p className="text-xs text-green-600">{runningDeployments.length} healthy</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CubeIcon className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pods</p>
              <p className="text-xl font-semibold text-gray-900">{totalPods}</p>
              <p className="text-xs text-green-600">{runningPods} running</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <CircleStackIcon className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Storage</p>
              <p className="text-xl font-semibold text-gray-900">{pvcs.length}</p>
              <p className="text-xs text-gray-500">volumes</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <ChartBarIcon className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Autoscalers</p>
              <p className="text-xl font-semibold text-gray-900">{hpas.length}</p>
              <p className="text-xs text-gray-500">HPAs active</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {[
            { id: 'apps', label: 'Applications', icon: CloudIcon },
            { id: 'pods', label: 'Pods', icon: CubeIcon },
            { id: 'storage', label: 'Storage', icon: CircleStackIcon },
            { id: 'scaling', label: 'Autoscaling', icon: ChartBarIcon },
            { id: 'metrics', label: 'Metrics', icon: CpuChipIcon },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={clsx(
                'flex items-center gap-2 pb-3 border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              <tab.icon className="h-5 w-5" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'apps' && (
        <AppsTab
          deployments={deployments}
          isLoading={deploymentsLoading}
          onAction={(appType, action) => appActionMutation.mutate({ appType, action })}
          onDelete={(appType) => {
            if (confirm(`Delete ${appType}? This cannot be undone.`)) {
              deleteMutation.mutate(appType)
            }
          }}
        />
      )}

      {activeTab === 'pods' && (
        <PodsTab pods={pods} isLoading={podsLoading} />
      )}

      {activeTab === 'storage' && (
        <StorageTab pvcs={pvcs} isLoading={pvcsLoading} />
      )}

      {activeTab === 'scaling' && (
        <ScalingTab hpas={hpas} isLoading={hpasLoading} />
      )}

      {activeTab === 'metrics' && (
        <MetricsTab metrics={metrics} isLoading={metricsLoading} />
      )}

      {/* Deploy Modal */}
      {showDeployModal && (
        <DeployModal
          availableApps={availableApps}
          onDeploy={(appType) => deployMutation.mutate(appType)}
          onClose={() => setShowDeployModal(false)}
          isDeploying={deployMutation.isPending}
        />
      )}
    </div>
  )
}

// Apps Tab
function AppsTab({
  deployments,
  isLoading,
  onAction,
  onDelete,
}: {
  deployments: CompanyDeployment[]
  isLoading: boolean
  onAction: (appType: string, action: string) => void
  onDelete: (appType: string) => void
}) {
  if (isLoading) {
    return <div className="py-12"><LoadingSpinner size="lg" /></div>
  }

  if (deployments.length === 0) {
    return (
      <div className="card text-center py-12">
        <CloudIcon className="h-12 w-12 mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Applications Deployed</h3>
        <p className="text-gray-500">Deploy your first EUSuite application to get started</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {deployments.map((dep) => {
        const appInfo = EUSUITE_APPS.find(a => a.id === dep.app_type) || { name: dep.name, icon: '📦', description: '' }
        const isHealthy = dep.ready_replicas === dep.replicas && dep.replicas > 0

        return (
          <div key={dep.name} className="card hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{appInfo.icon}</span>
                <div>
                  <h3 className="font-semibold text-gray-900">{appInfo.name}</h3>
                  <p className="text-xs text-gray-500">{dep.app_type}</p>
                </div>
              </div>
              <span className={clsx(
                'px-2 py-1 rounded-full text-xs font-medium',
                isHealthy ? statusColors.Healthy : statusColors.Degraded
              )}>
                {isHealthy ? 'Healthy' : 'Degraded'}
              </span>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Replicas</span>
                <span className={clsx(
                  'font-medium',
                  isHealthy ? 'text-green-600' : 'text-yellow-600'
                )}>
                  {dep.ready_replicas}/{dep.replicas}
                </span>
              </div>
              {dep.node_port && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Port</span>
                  <span className="font-medium text-gray-900">{dep.node_port}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Age</span>
                <span className="text-gray-600">{dep.age}</span>
              </div>
            </div>

            {dep.external_url && (
              <a
                href={dep.external_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 mb-4"
              >
                <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                Open Application
              </a>
            )}

            <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
              <button
                onClick={() => onAction(dep.app_type, 'restart')}
                className="flex-1 btn btn-secondary text-sm py-2"
              >
                <ArrowPathIcon className="h-4 w-4" />
                Restart
              </button>
              <button
                onClick={() => onDelete(dep.app_type)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Pods Tab
function PodsTab({ pods, isLoading }: { pods: CompanyPod[]; isLoading: boolean }) {
  if (isLoading) {
    return <div className="py-12"><LoadingSpinner size="lg" /></div>
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">App</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ready</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Restarts</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Age</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {pods.map((pod) => (
              <tr key={pod.name} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900 text-sm">{pod.name}</p>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{pod.app_type}</td>
                <td className="px-4 py-3">
                  <span className={clsx('px-2 py-1 rounded-full text-xs font-medium', statusColors[pod.status] || 'bg-gray-100 text-gray-600')}>
                    {pod.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{pod.ready}</td>
                <td className="px-4 py-3">
                  <span className={clsx('text-sm', pod.restarts > 5 ? 'text-red-600 font-medium' : 'text-gray-600')}>
                    {pod.restarts}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{pod.age}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{pod.ip || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Storage Tab
function StorageTab({ pvcs, isLoading }: { pvcs: CompanyPVC[]; isLoading: boolean }) {
  if (isLoading) {
    return <div className="py-12"><LoadingSpinner size="lg" /></div>
  }

  if (pvcs.length === 0) {
    return (
      <div className="card text-center py-12">
        <CircleStackIcon className="h-12 w-12 mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Storage Volumes</h3>
        <p className="text-gray-500">Storage volumes will appear here when apps request persistent storage</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {pvcs.map((pvc) => (
        <div key={pvc.name} className="card">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900">{pvc.name}</h4>
            <span className={clsx('px-2 py-1 rounded-full text-xs font-medium', statusColors[pvc.status] || 'bg-gray-100 text-gray-600')}>
              {pvc.status}
            </span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">App</span>
              <span className="text-gray-900">{pvc.app_type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Capacity</span>
              <span className="font-medium text-gray-900">{pvc.capacity}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Access</span>
              <span className="text-gray-600">{pvc.access_modes.join(', ')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Storage Class</span>
              <span className="text-gray-600">{pvc.storage_class}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// Scaling Tab
function ScalingTab({ hpas, isLoading }: { hpas: CompanyHPA[]; isLoading: boolean }) {
  if (isLoading) {
    return <div className="py-12"><LoadingSpinner size="lg" /></div>
  }

  if (hpas.length === 0) {
    return (
      <div className="card text-center py-12">
        <ChartBarIcon className="h-12 w-12 mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Autoscalers Configured</h3>
        <p className="text-gray-500">Horizontal Pod Autoscalers will appear here when configured</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {hpas.map((hpa) => (
        <div key={hpa.name} className="card">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-gray-900">{hpa.name}</h4>
            <span className="text-sm text-gray-500">{hpa.app_type}</span>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-500">Replicas</span>
                <span className="font-medium">
                  {hpa.current_replicas} / {hpa.min_replicas}-{hpa.max_replicas}
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{
                    width: `${((hpa.current_replicas - hpa.min_replicas) / (hpa.max_replicas - hpa.min_replicas)) * 100}%`
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-500">CPU Usage</span>
                <span className="font-medium">
                  {hpa.cpu_current !== null ? `${hpa.cpu_current}%` : '-'} / {hpa.cpu_target}%
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={clsx(
                    'h-full rounded-full transition-all',
                    hpa.cpu_current && hpa.cpu_current > hpa.cpu_target ? 'bg-red-500' : 'bg-green-500'
                  )}
                  style={{
                    width: `${hpa.cpu_current ? Math.min(100, (hpa.cpu_current / hpa.cpu_target) * 100) : 0}%`
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// Metrics Tab
function MetricsTab({ metrics, isLoading }: { metrics: ResourceUsage[]; isLoading: boolean }) {
  if (isLoading) {
    return <div className="py-12"><LoadingSpinner size="lg" /></div>
  }

  if (metrics.length === 0) {
    return (
      <div className="card text-center py-12">
        <CpuChipIcon className="h-12 w-12 mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Metrics Available</h3>
        <p className="text-gray-500">Resource metrics will appear here when available</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {metrics.map((metric) => {
        const appInfo = EUSUITE_APPS.find(a => a.id === metric.app_type) || { name: metric.app_type, icon: '📦' }
        return (
          <div key={metric.app_type} className="card">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">{appInfo.icon}</span>
              <h4 className="font-medium text-gray-900">{appInfo.name}</h4>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-500 flex items-center gap-1">
                    <CpuChipIcon className="h-4 w-4" />
                    CPU
                  </span>
                  <span className="font-medium text-gray-900">{metric.cpu}</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${metric.cpu_percent || Math.min(100, parseFloat(metric.cpu) / 10)}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-500 flex items-center gap-1">
                    <CircleStackIcon className="h-4 w-4" />
                    Memory
                  </span>
                  <span className="font-medium text-gray-900">{metric.memory}</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full"
                    style={{ width: `${metric.memory_percent || Math.min(100, parseFloat(metric.memory) / 5)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Deploy Modal
function DeployModal({
  availableApps,
  onDeploy,
  onClose,
  isDeploying,
}: {
  availableApps: typeof EUSUITE_APPS
  onDeploy: (appType: string) => void
  onClose: () => void
  isDeploying: boolean
}) {
  const [selectedApp, setSelectedApp] = useState<string | null>(null)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Deploy Application</h2>
          <p className="text-gray-500 mt-1">Select an EUSuite application to deploy</p>
        </div>

        <div className="p-6 overflow-y-auto max-h-[50vh]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableApps.map((app) => (
              <button
                key={app.id}
                onClick={() => setSelectedApp(app.id)}
                className={clsx(
                  'p-4 rounded-xl border-2 text-left transition-all',
                  selectedApp === app.id
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{app.icon}</span>
                  <span className="font-medium text-gray-900">{app.name}</span>
                </div>
                <p className="text-sm text-gray-500">{app.description}</p>
                <p className="text-xs text-gray-400 mt-1">Port: {app.port}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button
            onClick={() => selectedApp && onDeploy(selectedApp)}
            disabled={!selectedApp || isDeploying}
            className="btn btn-primary"
          >
            {isDeploying ? (
              <>
                <LoadingSpinner size="sm" />
                Deploying...
              </>
            ) : (
              <>
                <CloudIcon className="h-5 w-5" />
                Deploy
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
