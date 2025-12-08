import { useState, useEffect } from 'react';
import { Cpu, MemoryStick, Server, RefreshCw, RotateCcw } from 'lucide-react';
import { adminApi, PodMetrics, Deployment } from '../api/client';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function SystemPage() {
  const [metrics, setMetrics] = useState<PodMetrics[]>([]);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [totalCpu, setTotalCpu] = useState(0);
  const [totalMemory, setTotalMemory] = useState(0);
  const [loading, setLoading] = useState(true);
  const [restarting, setRestarting] = useState<string | null>(null);

  useEffect(() => {
    loadSystemData();
    const interval = setInterval(loadSystemData, 15000);
    return () => clearInterval(interval);
  }, []);

  const loadSystemData = async () => {
    try {
      const [usageData, deploymentsData] = await Promise.all([
        adminApi.getSystemUsage(),
        adminApi.getDeployments(),
      ]);
      setMetrics(usageData.pods);
      setTotalCpu(usageData.total_cpu_millicores);
      setTotalMemory(usageData.total_memory_mb);
      setDeployments(deploymentsData.deployments);
    } catch (err) {
      console.error('Failed to load system data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRestartDeployment = async (name: string) => {
    if (!confirm(`Restart deployment "${name}"?`)) return;
    setRestarting(name);
    try {
      await adminApi.restartDeployment(name);
      alert(`Deployment ${name} restart initiated`);
      setTimeout(loadSystemData, 5000);
    } catch {
      alert('Failed to restart deployment');
    } finally {
      setRestarting(null);
    }
  };

  const cpuChartData = metrics.map((m) => ({
    name: m.name.split('-').slice(0, 2).join('-'),
    value: m.cpu_millicores,
  }));

  const memoryChartData = metrics.map((m) => ({
    name: m.name.split('-').slice(0, 2).join('-'),
    value: m.memory_mb,
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Usage</h1>
          <p className="text-gray-500">Kubernetes cluster resource monitoring</p>
        </div>
        <button onClick={loadSystemData} className="btn-secondary flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="admin-stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total CPU</p>
              <p className="text-3xl font-bold text-gray-900">{totalCpu} m</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Cpu className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-2">millicores used</p>
        </div>

        <div className="admin-stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Memory</p>
              <p className="text-3xl font-bold text-gray-900">{totalMemory.toFixed(0)} MB</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <MemoryStick className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-2">{(totalMemory / 1024).toFixed(2)} GB</p>
        </div>

        <div className="admin-stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Pods</p>
              <p className="text-3xl font-bold text-gray-900">{metrics.length}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <Server className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-2">containers running</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CPU Chart */}
        <div className="admin-card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">CPU Usage by Pod</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cpuChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-45} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="#93c5fd" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Memory Chart */}
        <div className="admin-card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Memory Usage by Pod</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={memoryChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-45} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="#8b5cf6" fill="#c4b5fd" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Deployments */}
      <div className="admin-card overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Deployments</h3>
        </div>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Replicas</th>
              <th>Ready</th>
              <th>Available</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {deployments.map((dep) => (
              <tr key={dep.name}>
                <td className="font-medium">{dep.name}</td>
                <td>{dep.replicas}</td>
                <td>{dep.ready_replicas}</td>
                <td>{dep.available_replicas}</td>
                <td>
                  {dep.ready_replicas === dep.replicas ? (
                    <span className="badge badge-success">Healthy</span>
                  ) : (
                    <span className="badge badge-warning">Updating</span>
                  )}
                </td>
                <td>
                  <button
                    onClick={() => handleRestartDeployment(dep.name)}
                    disabled={restarting === dep.name}
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium disabled:opacity-50"
                  >
                    <RotateCcw className={`w-4 h-4 ${restarting === dep.name ? 'animate-spin' : ''}`} />
                    Restart
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pod Metrics Table */}
      <div className="admin-card overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Pod Metrics</h3>
        </div>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Pod Name</th>
              <th>CPU (millicores)</th>
              <th>Memory (MB)</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((metric) => (
              <tr key={metric.name}>
                <td className="font-mono text-xs">{metric.name}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${Math.min(metric.cpu_millicores / 10, 100)}%` }}
                      ></div>
                    </div>
                    <span>{metric.cpu_millicores}</span>
                  </div>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-500 h-2 rounded-full"
                        style={{ width: `${Math.min(metric.memory_mb / 5, 100)}%` }}
                      ></div>
                    </div>
                    <span>{metric.memory_mb.toFixed(1)}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
