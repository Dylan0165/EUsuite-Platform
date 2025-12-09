import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ServerIcon,
  CpuChipIcon,
  CircleStackIcon,
  ArrowPathIcon,
  TrashIcon,
  ChartBarIcon,
  CloudIcon,
  CubeIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import apiClient from '@/api/client'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import { clsx } from 'clsx'

// Types
interface PlatformStats {
  total_namespaces: number
  total_pods: number
  running_pods: number
  pending_pods: number
  failed_pods: number
  total_deployments: number
  total_services: number
  total_pvcs: number
}

interface Pod {
  name: string
  namespace: string
  status: string
  phase: string
  ready: string
  restarts: number
  age: string
  node: string
  ip: string
  containers: Container[]
}

interface Container {
  name: string
  image: string
  ready: boolean
  restart_count: number
  state: string
}

interface Deployment {
  name: string
  namespace: string
  replicas: number
  ready_replicas: number
  available_replicas: number
  age: string
  status: string
  images: string[]
}

interface Namespace {
  name: string
  status: string
  age: string
  labels: Record<string, string>
}

interface PodMetrics {
  name: string
  namespace: string
  cpu: string
  memory: string
  cpu_percent?: number
  memory_percent?: number
}

const statusColors: Record<string, string> = {
  Running: 'text-green-600 bg-green-100',
  Pending: 'text-yellow-600 bg-yellow-100',
  Failed: 'text-red-600 bg-red-100',
  Succeeded: 'text-blue-600 bg-blue-100',
  Unknown: 'text-gray-600 bg-gray-100',
  Active: 'text-green-600 bg-green-100',
  Terminating: 'text-orange-600 bg-orange-100',
}

export default function KubernetesPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'overview' | 'pods' | 'deployments' | 'namespaces' | 'metrics'>('overview')
  const [selectedNamespace, setSelectedNamespace] = useState<string>('all')
  const [autoRefresh, setAutoRefresh] = useState(false)

  // Platform Stats Query
  const { data: stats, isLoading: statsLoading } = useQuery<PlatformStats>({
    queryKey: ['k8s-stats'],
    queryFn: async () => {
      const { data } = await apiClient.get('/kubernetes/stats')
      return data
    },
    refetchInterval: autoRefresh ? 10000 : false,
  })

  // Namespaces Query
  const { data: namespaces = [] } = useQuery<Namespace[]>({
    queryKey: ['k8s-namespaces'],
    queryFn: async () => {
      const { data } = await apiClient.get('/kubernetes/namespaces')
      return data
    },
  })

  // Pods Query
  const { data: pods = [], isLoading: podsLoading } = useQuery<Pod[]>({
    queryKey: ['k8s-pods', selectedNamespace],
    queryFn: async () => {
      const params = selectedNamespace !== 'all' ? `?namespace=${selectedNamespace}` : ''
      const { data } = await apiClient.get(`/kubernetes/pods${params}`)
      return data
    },
    refetchInterval: autoRefresh ? 5000 : false,
    enabled: activeTab === 'pods' || activeTab === 'overview',
  })

  // Deployments Query
  const { data: deployments = [], isLoading: deploymentsLoading } = useQuery<Deployment[]>({
    queryKey: ['k8s-deployments', selectedNamespace],
    queryFn: async () => {
      const params = selectedNamespace !== 'all' ? `?namespace=${selectedNamespace}` : ''
      const { data } = await apiClient.get(`/kubernetes/deployments${params}`)
      return data
    },
    refetchInterval: autoRefresh ? 10000 : false,
    enabled: activeTab === 'deployments' || activeTab === 'overview',
  })

  // Metrics Query
  const { data: metrics = [], isLoading: metricsLoading } = useQuery<PodMetrics[]>({
    queryKey: ['k8s-metrics', selectedNamespace],
    queryFn: async () => {
      const params = selectedNamespace !== 'all' ? `?namespace=${selectedNamespace}` : ''
      const { data } = await apiClient.get(`/kubernetes/metrics${params}`)
      return data
    },
    refetchInterval: autoRefresh ? 5000 : false,
    enabled: activeTab === 'metrics',
  })

  // Pod Actions
  const podActionMutation = useMutation({
    mutationFn: async ({ namespace, name, action }: { namespace: string; name: string; action: string }) => {
      return await apiClient.post(`/kubernetes/pods/${namespace}/${name}/${action}`)
    },
    onSuccess: (_, { action }) => {
      toast.success(`Pod ${action} successful`)
      queryClient.invalidateQueries({ queryKey: ['k8s-pods'] })
      queryClient.invalidateQueries({ queryKey: ['k8s-stats'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Action failed')
    },
  })

  // Deployment Actions
  const deploymentActionMutation = useMutation({
    mutationFn: async ({ namespace, name, action }: { namespace: string; name: string; action: string }) => {
      return await apiClient.post(`/kubernetes/deployments/${namespace}/${name}/${action}`)
    },
    onSuccess: (_, { action }) => {
      toast.success(`Deployment ${action} initiated`)
      queryClient.invalidateQueries({ queryKey: ['k8s-deployments'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Action failed')
    },
  })

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ['k8s-stats'] })
    queryClient.invalidateQueries({ queryKey: ['k8s-pods'] })
    queryClient.invalidateQueries({ queryKey: ['k8s-deployments'] })
    queryClient.invalidateQueries({ queryKey: ['k8s-namespaces'] })
    queryClient.invalidateQueries({ queryKey: ['k8s-metrics'] })
    toast.success('Data refreshed')
  }

  const tenantNamespaces = namespaces.filter(ns => ns.name.startsWith('org-'))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kubernetes Cluster</h1>
          <p className="text-gray-500 mt-1">Monitor and manage the platform infrastructure</p>
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
          <button
            onClick={refreshAll}
            className="btn btn-secondary"
          >
            <ArrowPathIcon className="h-5 w-5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {statsLoading ? (
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card animate-pulse h-24 bg-gray-100" />
          ))}
        </div>
      ) : stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={<CubeIcon className="h-6 w-6 text-blue-600" />}
            label="Total Pods"
            value={stats.total_pods}
            subValue={`${stats.running_pods} running`}
            color="blue"
          />
          <StatCard
            icon={<ServerIcon className="h-6 w-6 text-purple-600" />}
            label="Deployments"
            value={stats.total_deployments}
            subValue={`${tenantNamespaces.length} tenants`}
            color="purple"
          />
          <StatCard
            icon={<CloudIcon className="h-6 w-6 text-green-600" />}
            label="Services"
            value={stats.total_services}
            subValue={`${stats.total_namespaces} namespaces`}
            color="green"
          />
          <StatCard
            icon={<CircleStackIcon className="h-6 w-6 text-orange-600" />}
            label="Storage Claims"
            value={stats.total_pvcs}
            subValue="Persistent volumes"
            color="orange"
          />
        </div>
      )}

      {/* Pod Status Overview */}
      {stats && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Pod Health Overview</h3>
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <CheckCircleIcon className="h-5 w-5 text-green-500" />
              <span className="text-sm text-gray-600">Running: {stats.running_pods}</span>
            </div>
            <div className="flex items-center gap-2">
              <ClockIcon className="h-5 w-5 text-yellow-500" />
              <span className="text-sm text-gray-600">Pending: {stats.pending_pods}</span>
            </div>
            <div className="flex items-center gap-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
              <span className="text-sm text-gray-600">Failed: {stats.failed_pods}</span>
            </div>
            <div className="ml-auto">
              <div className="h-3 w-64 bg-gray-200 rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-green-500"
                  style={{ width: `${(stats.running_pods / stats.total_pods) * 100}%` }}
                />
                <div
                  className="h-full bg-yellow-500"
                  style={{ width: `${(stats.pending_pods / stats.total_pods) * 100}%` }}
                />
                <div
                  className="h-full bg-red-500"
                  style={{ width: `${(stats.failed_pods / stats.total_pods) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {[
            { id: 'overview', label: 'Overview', icon: ChartBarIcon },
            { id: 'pods', label: 'Pods', icon: CubeIcon },
            { id: 'deployments', label: 'Deployments', icon: ServerIcon },
            { id: 'namespaces', label: 'Namespaces', icon: CloudIcon },
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

      {/* Namespace Filter */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700">Namespace:</label>
        <select
          value={selectedNamespace}
          onChange={(e) => setSelectedNamespace(e.target.value)}
          className="input w-64"
        >
          <option value="all">All Namespaces</option>
          <option value="default">default</option>
          <option value="kube-system">kube-system</option>
          {tenantNamespaces.map((ns) => (
            <option key={ns.name} value={ns.name}>{ns.name}</option>
          ))}
        </select>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <OverviewTab
          pods={pods}
          deployments={deployments}
          namespaces={tenantNamespaces}
          podsLoading={podsLoading}
        />
      )}

      {activeTab === 'pods' && (
        <PodsTab
          pods={pods}
          isLoading={podsLoading}
          onAction={(namespace, name, action) =>
            podActionMutation.mutate({ namespace, name, action })
          }
        />
      )}

      {activeTab === 'deployments' && (
        <DeploymentsTab
          deployments={deployments}
          isLoading={deploymentsLoading}
          onAction={(namespace, name, action) =>
            deploymentActionMutation.mutate({ namespace, name, action })
          }
        />
      )}

      {activeTab === 'namespaces' && (
        <NamespacesTab namespaces={namespaces} />
      )}

      {activeTab === 'metrics' && (
        <MetricsTab metrics={metrics} isLoading={metricsLoading} />
      )}
    </div>
  )
}

// Stat Card Component
function StatCard({
  icon,
  label,
  value,
  subValue,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: number
  subValue: string
  color: string
}) {
  return (
    <div className="card">
      <div className="flex items-center gap-4">
        <div className={`p-3 bg-${color}-100 rounded-xl`}>
          {icon}
        </div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-400">{subValue}</p>
        </div>
      </div>
    </div>
  )
}

// Overview Tab
function OverviewTab({
  pods,
  deployments: _deployments,
  namespaces,
  podsLoading,
}: {
  pods: Pod[]
  deployments: Deployment[]
  namespaces: Namespace[]
  podsLoading: boolean
}) {
  const recentPods = pods.slice(0, 5)
  const problemPods = pods.filter(p => p.status !== 'Running' && p.status !== 'Succeeded')

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Problem Pods */}
      {problemPods.length > 0 && (
        <div className="card lg:col-span-2 border-l-4 border-red-500">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
            Pods Requiring Attention ({problemPods.length})
          </h3>
          <div className="space-y-2">
            {problemPods.slice(0, 5).map((pod) => (
              <div key={`${pod.namespace}-${pod.name}`} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{pod.name}</p>
                  <p className="text-sm text-gray-500">{pod.namespace}</p>
                </div>
                <span className={clsx('px-2 py-1 rounded-full text-xs font-medium', statusColors[pod.status] || statusColors.Unknown)}>
                  {pod.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Pods */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Pods</h3>
        {podsLoading ? (
          <LoadingSpinner />
        ) : (
          <div className="space-y-3">
            {recentPods.map((pod) => (
              <div key={`${pod.namespace}-${pod.name}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={clsx(
                    'w-2 h-2 rounded-full',
                    pod.status === 'Running' ? 'bg-green-500' : pod.status === 'Pending' ? 'bg-yellow-500' : 'bg-red-500'
                  )} />
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{pod.name}</p>
                    <p className="text-xs text-gray-500">{pod.namespace}</p>
                  </div>
                </div>
                <span className="text-xs text-gray-400">{pod.age}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tenant Namespaces */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Tenant Namespaces</h3>
        <div className="space-y-3">
          {namespaces.length === 0 ? (
            <p className="text-gray-500 text-sm">No tenant namespaces found</p>
          ) : (
            namespaces.slice(0, 5).map((ns) => {
              const nsPods = pods.filter(p => p.namespace === ns.name)
              const runningCount = nsPods.filter(p => p.status === 'Running').length
              return (
                <div key={ns.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{ns.name}</p>
                    <p className="text-xs text-gray-500">{ns.age} old</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-green-600">{runningCount}/{nsPods.length}</span>
                    <p className="text-xs text-gray-400">pods running</p>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

// Pods Tab
function PodsTab({
  pods,
  isLoading,
  onAction,
}: {
  pods: Pod[]
  isLoading: boolean
  onAction: (namespace: string, name: string, action: string) => void
}) {
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
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Namespace</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ready</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Restarts</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Age</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Node</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {pods.map((pod) => (
              <tr key={`${pod.namespace}-${pod.name}`} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900 text-sm">{pod.name}</p>
                  <p className="text-xs text-gray-500">{pod.ip || 'No IP'}</p>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{pod.namespace}</td>
                <td className="px-4 py-3">
                  <span className={clsx('px-2 py-1 rounded-full text-xs font-medium', statusColors[pod.status] || statusColors.Unknown)}>
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
                <td className="px-4 py-3 text-sm text-gray-600">{pod.node || '-'}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onAction(pod.namespace, pod.name, 'restart')}
                      className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                      title="Restart"
                    >
                      <ArrowPathIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onAction(pod.namespace, pod.name, 'logs')}
                      className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded"
                      title="View Logs"
                    >
                      <ChartBarIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete pod ${pod.name}?`)) {
                          onAction(pod.namespace, pod.name, 'delete')
                        }
                      }}
                      className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                      title="Delete"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Deployments Tab
function DeploymentsTab({
  deployments,
  isLoading,
  onAction,
}: {
  deployments: Deployment[]
  isLoading: boolean
  onAction: (namespace: string, name: string, action: string) => void
}) {
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
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Namespace</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Replicas</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Age</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Images</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {deployments.map((dep) => (
              <tr key={`${dep.namespace}-${dep.name}`} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900 text-sm">{dep.name}</p>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{dep.namespace}</td>
                <td className="px-4 py-3">
                  <span className={clsx(
                    'px-2 py-1 rounded-full text-xs font-medium',
                    dep.ready_replicas === dep.replicas
                      ? 'bg-green-100 text-green-800'
                      : dep.ready_replicas > 0
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  )}>
                    {dep.ready_replicas === dep.replicas ? 'Healthy' : 'Degraded'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className={clsx(
                    dep.ready_replicas === dep.replicas ? 'text-green-600' : 'text-yellow-600'
                  )}>
                    {dep.ready_replicas}/{dep.replicas}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{dep.age}</td>
                <td className="px-4 py-3">
                  <div className="max-w-xs truncate">
                    {dep.images.map((img, i) => (
                      <p key={i} className="text-xs text-gray-500 truncate">{img.split('/').pop()}</p>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onAction(dep.namespace, dep.name, 'restart')}
                      className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                      title="Restart"
                    >
                      <ArrowPathIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onAction(dep.namespace, dep.name, 'scale')}
                      className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded"
                      title="Scale"
                    >
                      <ChartBarIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete deployment ${dep.name}?`)) {
                          onAction(dep.namespace, dep.name, 'delete')
                        }
                      }}
                      className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                      title="Delete"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Namespaces Tab
function NamespacesTab({ namespaces }: { namespaces: Namespace[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {namespaces.map((ns) => (
        <div key={ns.name} className="card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={clsx(
                'w-3 h-3 rounded-full',
                ns.status === 'Active' ? 'bg-green-500' : 'bg-gray-400'
              )} />
              <h4 className="font-medium text-gray-900">{ns.name}</h4>
            </div>
            <span className={clsx('px-2 py-1 rounded-full text-xs font-medium', statusColors[ns.status] || statusColors.Unknown)}>
              {ns.status}
            </span>
          </div>
          <p className="text-sm text-gray-500 mb-2">Age: {ns.age}</p>
          {Object.keys(ns.labels).length > 0 && (
            <div className="flex flex-wrap gap-1">
              {Object.entries(ns.labels).slice(0, 3).map(([key, value]) => (
                <span key={key} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                  {key.split('/').pop()}: {value}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// Metrics Tab
function MetricsTab({ metrics, isLoading }: { metrics: PodMetrics[]; isLoading: boolean }) {
  if (isLoading) {
    return <div className="py-12"><LoadingSpinner size="lg" /></div>
  }

  if (metrics.length === 0) {
    return (
      <div className="card text-center py-12">
        <CpuChipIcon className="h-12 w-12 mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Metrics Available</h3>
        <p className="text-gray-500">Metrics server might not be installed or accessible</p>
      </div>
    )
  }

  const sortedByCpu = [...metrics].sort((a, b) => 
    parseFloat(b.cpu.replace('m', '')) - parseFloat(a.cpu.replace('m', ''))
  ).slice(0, 10)

  const sortedByMemory = [...metrics].sort((a, b) => 
    parseFloat(b.memory.replace('Mi', '').replace('Gi', '')) - parseFloat(a.memory.replace('Mi', '').replace('Gi', ''))
  ).slice(0, 10)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Top CPU Usage */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <CpuChipIcon className="h-5 w-5 text-blue-500" />
          Top CPU Usage
        </h3>
        <div className="space-y-3">
          {sortedByCpu.map((pod) => (
            <div key={`${pod.namespace}-${pod.name}`} className="flex items-center justify-between">
              <div className="flex-1 min-w-0 mr-4">
                <p className="text-sm font-medium text-gray-900 truncate">{pod.name}</p>
                <p className="text-xs text-gray-500">{pod.namespace}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${Math.min(100, parseFloat(pod.cpu) / 10)}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-700 w-16 text-right">{pod.cpu}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Memory Usage */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <CircleStackIcon className="h-5 w-5 text-purple-500" />
          Top Memory Usage
        </h3>
        <div className="space-y-3">
          {sortedByMemory.map((pod) => (
            <div key={`${pod.namespace}-${pod.name}`} className="flex items-center justify-between">
              <div className="flex-1 min-w-0 mr-4">
                <p className="text-sm font-medium text-gray-900 truncate">{pod.name}</p>
                <p className="text-xs text-gray-500">{pod.namespace}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-purple-500 rounded-full"
                    style={{ width: `${Math.min(100, parseFloat(pod.memory) / 5)}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-700 w-16 text-right">{pod.memory}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
