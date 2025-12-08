import { useState, useEffect } from 'react';
import {
  Users,
  HardDrive,
  Activity,
  Server,
  AlertTriangle,
  CheckCircle,
  Building2,
  Rocket,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { adminApi, SystemStats, Pod, PodMetrics } from '../api/client';
import { platformApi, type PlatformStats } from '../api/tenant';
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

export default function DashboardPage() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
  const [pods, setPods] = useState<Pod[]>([]);
  const [metrics, setMetrics] = useState<PodMetrics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    // Refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      const [statsData, podsData, usageData, platformData] = await Promise.all([
        adminApi.getSystemStats(),
        adminApi.getPods(),
        adminApi.getSystemUsage(),
        platformApi.getStats().catch(() => null),
      ]);
      setStats(statsData);
      setPods(podsData.pods);
      setMetrics(usageData.pods);
      setPlatformStats(platformData);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const healthyPods = pods.filter((p) => p.ready && p.status === 'Running').length;
  const unhealthyPods = pods.length - healthyPods;

  const podStatusData = [
    { name: 'Healthy', value: healthyPods, color: '#22c55e' },
    { name: 'Unhealthy', value: unhealthyPods, color: '#ef4444' },
  ];

  const cpuData = metrics.slice(0, 8).map((m) => ({
    name: m.name.split('-').slice(0, 2).join('-'),
    cpu: m.cpu_millicores,
  }));

  const memoryData = metrics.slice(0, 8).map((m) => ({
    name: m.name.split('-').slice(0, 2).join('-'),
    memory: m.memory_mb,
  }));

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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">System overview and monitoring</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Users */}
        <div className="admin-stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Users</p>
              <p className="text-3xl font-bold text-gray-900">{stats?.total_users || 0}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="badge badge-success">{stats?.active_users_24h || 0} active</span>
            <span className="text-xs text-gray-400">last 24h</span>
          </div>
        </div>

        {/* Total Storage */}
        <div className="admin-stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Storage</p>
              <p className="text-3xl font-bold text-gray-900">
                {stats?.total_storage?.total_gb?.toFixed(2) || '0'} GB
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <HardDrive className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="text-sm text-gray-600">
              {stats?.total_storage?.total_files || 0} files
            </span>
          </div>
        </div>

        {/* Active Pods */}
        <div className="admin-stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Pods</p>
              <p className="text-3xl font-bold text-gray-900">{healthyPods}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <Server className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            {unhealthyPods > 0 ? (
              <span className="badge badge-danger">{unhealthyPods} issues</span>
            ) : (
              <span className="badge badge-success">All healthy</span>
            )}
          </div>
        </div>

        {/* System Health */}
        <div className="admin-stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">System Health</p>
              <p className="text-3xl font-bold text-gray-900">
                {unhealthyPods === 0 ? 'Good' : 'Warning'}
              </p>
            </div>
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                unhealthyPods === 0 ? 'bg-green-100' : 'bg-yellow-100'
              }`}
            >
              {unhealthyPods === 0 ? (
                <CheckCircle className="w-6 h-6 text-green-600" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-yellow-600" />
              )}
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">Monitoring active</span>
          </div>
        </div>
      </div>

      {/* Multi-Tenant Stats */}
      {platformStats && (
        <div className="admin-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Multi-Tenant Platform</h3>
            <Link
              to="/companies"
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              View All Tenants →
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="w-4 h-4 text-primary-600" />
                <span className="text-xs text-gray-500">Total Companies</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{platformStats.total_companies}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-xs text-gray-500">Active</span>
              </div>
              <p className="text-2xl font-bold text-green-600">{platformStats.active_companies}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                <span className="text-xs text-gray-500">Pending</span>
              </div>
              <p className="text-2xl font-bold text-yellow-600">{platformStats.pending_approval}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-blue-600" />
                <span className="text-xs text-gray-500">Tenant Users</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{platformStats.total_users}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Rocket className="w-4 h-4 text-purple-600" />
                <span className="text-xs text-gray-500">Deployments</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{platformStats.total_deployments}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Server className="w-4 h-4 text-orange-600" />
                <span className="text-xs text-gray-500">Namespaces</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{platformStats.active_namespaces}</p>
            </div>
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CPU Usage Chart */}
        <div className="admin-card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">CPU Usage (millicores)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cpuData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="cpu" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Memory Usage Chart */}
        <div className="admin-card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Memory Usage (MB)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={memoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="memory" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Pods Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pod Health Pie */}
        <div className="admin-card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Pod Health</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={podStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={60}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {podStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-4">
            {podStatusData.map((entry) => (
              <div key={entry.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-sm text-gray-600">
                  {entry.name}: {entry.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Pods List */}
        <div className="admin-card p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Pod Status</h3>
          <div className="overflow-x-auto max-h-64 overflow-y-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Pod</th>
                  <th>Status</th>
                  <th>Restarts</th>
                  <th>App</th>
                </tr>
              </thead>
              <tbody>
                {pods.map((pod) => (
                  <tr key={pod.name}>
                    <td className="font-mono text-xs">{pod.name}</td>
                    <td>
                      {pod.ready && pod.status === 'Running' ? (
                        <span className="badge badge-success">Running</span>
                      ) : (
                        <span className="badge badge-danger">{pod.status}</span>
                      )}
                    </td>
                    <td>
                      {pod.restarts > 0 ? (
                        <span className="text-red-600">{pod.restarts}</span>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
                    <td className="text-gray-600">{pod.app}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
