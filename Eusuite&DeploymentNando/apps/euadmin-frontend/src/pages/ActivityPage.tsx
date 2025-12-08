import { useState, useEffect } from 'react';
import { Activity, Search, RefreshCw, FileText, User, Clock } from 'lucide-react';
import { adminApi } from '../api/client';
import type { PodInfo } from '../api/client';

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
}

export default function ActivityPage() {
  const [pods, setPods] = useState<PodInfo[]>([]);
  const [selectedPod, setSelectedPod] = useState<string>('');
  const [logs, setLogs] = useState<string>('');
  const [parsedLogs, setParsedLogs] = useState<LogEntry[]>([]);
  const [tailLines, setTailLines] = useState(100);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(false);

  useEffect(() => {
    loadPods();
  }, []);

  useEffect(() => {
    if (selectedPod) {
      loadLogs();
    }
  }, [selectedPod, tailLines]);

  const loadPods = async () => {
    try {
      const data = await adminApi.getPods();
      setPods(data.pods);
      if (data.pods.length > 0) {
        setSelectedPod(data.pods[0].name);
      }
    } catch (err) {
      console.error('Failed to load pods:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    if (!selectedPod) return;
    setLoadingLogs(true);
    try {
      const data = await adminApi.getLogs(selectedPod, tailLines);
      setLogs(data.logs);
      parseLogs(data.logs);
    } catch (err) {
      console.error('Failed to load logs:', err);
      setLogs('Failed to load logs');
    } finally {
      setLoadingLogs(false);
    }
  };

  const parseLogs = (rawLogs: string) => {
    const lines = rawLogs.split('\n').filter((line) => line.trim());
    const parsed: LogEntry[] = lines.map((line) => {
      const timestampMatch = line.match(/^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}/);
      const levelMatch = line.match(/\b(INFO|WARN|ERROR|DEBUG|WARNING|CRITICAL)\b/i);
      return {
        timestamp: timestampMatch ? timestampMatch[0] : '',
        level: levelMatch ? levelMatch[1].toUpperCase() : 'INFO',
        message: line,
      };
    });
    setParsedLogs(parsed);
  };

  const filteredLogs = parsedLogs.filter((log) =>
    log.message.toLowerCase().includes(search.toLowerCase())
  );

  const getLevelBadge = (level: string) => {
    const colors: Record<string, string> = {
      ERROR: 'bg-red-100 text-red-700',
      CRITICAL: 'bg-red-100 text-red-700',
      WARN: 'bg-yellow-100 text-yellow-700',
      WARNING: 'bg-yellow-100 text-yellow-700',
      INFO: 'bg-blue-100 text-blue-700',
      DEBUG: 'bg-gray-100 text-gray-700',
    };
    return colors[level] || colors.INFO;
  };

  const getPodStatusBadge = (status: string) => {
    if (status === 'Running') return 'badge-success';
    if (status === 'Pending') return 'badge-warning';
    return 'badge-error';
  };

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
        <h1 className="text-2xl font-bold text-gray-900">Activity Logs</h1>
        <p className="text-gray-500">View pod logs and system activity</p>
      </div>

      {/* Pods Overview */}
      <div className="admin-card overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary-500" />
            Pod Status
          </h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 p-4">
          {pods.map((pod) => (
            <button
              key={pod.name}
              onClick={() => setSelectedPod(pod.name)}
              className={`p-3 rounded-lg border-2 transition-all ${
                selectedPod === pod.name
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-gray-500" />
                <span className={`badge ${getPodStatusBadge(pod.status)}`}>{pod.status}</span>
              </div>
              <p className="text-xs font-mono text-gray-700 truncate" title={pod.name}>
                {pod.name.split('-').slice(0, 2).join('-')}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Log Controls */}
      <div className="admin-card p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search logs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-10 w-full"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Lines:</label>
            <select
              value={tailLines}
              onChange={(e) => setTailLines(Number(e.target.value))}
              className="input w-24"
            >
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={250}>250</option>
              <option value={500}>500</option>
            </select>
          </div>

          <button
            onClick={loadLogs}
            disabled={loadingLogs}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loadingLogs ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Selected Pod Info */}
      {selectedPod && (
        <div className="admin-card p-4 bg-gray-50">
          <div className="flex items-center gap-4">
            <FileText className="w-5 h-5 text-primary-500" />
            <div>
              <p className="font-medium text-gray-900">Viewing logs for:</p>
              <p className="font-mono text-sm text-gray-600">{selectedPod}</p>
            </div>
            <div className="ml-auto flex items-center gap-2 text-sm text-gray-500">
              <Clock className="w-4 h-4" />
              <span>Showing last {tailLines} lines</span>
            </div>
          </div>
        </div>
      )}

      {/* Logs Display */}
      <div className="admin-card overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Log Output</h3>
          <span className="text-sm text-gray-500">{filteredLogs.length} entries</span>
        </div>

        {loadingLogs ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
          </div>
        ) : (
          <div className="max-h-[600px] overflow-y-auto">
            {filteredLogs.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No logs found</div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th className="w-32">Timestamp</th>
                    <th className="w-20">Level</th>
                    <th>Message</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log, idx) => (
                    <tr key={idx}>
                      <td className="font-mono text-xs text-gray-500 whitespace-nowrap">
                        {log.timestamp || '-'}
                      </td>
                      <td>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getLevelBadge(log.level)}`}>
                          {log.level}
                        </span>
                      </td>
                      <td className="font-mono text-xs text-gray-700 break-all">
                        {log.message}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Raw Logs Fallback */}
      <details className="admin-card overflow-hidden">
        <summary className="p-4 cursor-pointer hover:bg-gray-50 font-medium text-gray-700">
          View Raw Logs
        </summary>
        <pre className="p-4 bg-gray-900 text-gray-100 text-xs overflow-x-auto max-h-96">
          {logs || 'No logs available'}
        </pre>
      </details>
    </div>
  );
}
