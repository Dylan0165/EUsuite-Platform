import { useState, useEffect } from 'react';
import {
  Users,
  HardDrive,
  Grid3X3,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useAuthStore } from '../store/authStore';
import { statsApi, DashboardStats, UsageHistory } from '../api/client';

const mockStats: DashboardStats = {
  total_users: 24,
  active_users: 18,
  storage_used_gb: 45.2,
  storage_limit_gb: 100,
  apps_enabled: 3,
  apps_total: 4,
};

const mockUsageHistory: UsageHistory[] = Array.from({ length: 30 }, (_, i) => ({
  date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  active_users: Math.floor(Math.random() * 10) + 12,
  storage_gb: 40 + Math.random() * 10,
}));

export default function DashboardPage() {
  const { company, user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats>(mockStats);
  const [usageHistory, setUsageHistory] = useState<UsageHistory[]>(mockUsageHistory);
  const [_loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, historyData] = await Promise.all([
          statsApi.dashboard(),
          statsApi.usageHistory(30),
        ]);
        setStats(statsData);
        setUsageHistory(historyData);
      } catch {
        // Use mock data on error
        console.log('Using mock data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const statCards = [
    {
      label: 'Totaal Gebruikers',
      value: stats.total_users,
      subValue: `${stats.active_users} actief`,
      icon: Users,
      trend: '+12%',
      trendUp: true,
    },
    {
      label: 'Opslag Gebruikt',
      value: `${stats.storage_used_gb.toFixed(1)} GB`,
      subValue: `van ${stats.storage_limit_gb} GB`,
      icon: HardDrive,
      trend: '+5%',
      trendUp: true,
    },
    {
      label: 'Apps Actief',
      value: stats.apps_enabled,
      subValue: `van ${stats.apps_total} beschikbaar`,
      icon: Grid3X3,
      trend: '0%',
      trendUp: true,
    },
    {
      label: 'Activiteit',
      value: '94%',
      subValue: 'uptime deze maand',
      icon: TrendingUp,
      trend: '+2%',
      trendUp: true,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welkom terug, {user?.first_name}!
        </h1>
        <p className="text-gray-600">
          Hier is een overzicht van {company?.name}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <div key={stat.label} className="card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stat.value}
                </p>
                <p className="text-sm text-gray-500 mt-1">{stat.subValue}</p>
              </div>
              <div className="p-3 bg-primary-50 rounded-lg">
                <stat.icon className="w-6 h-6 text-primary-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-1">
              {stat.trendUp ? (
                <ArrowUpRight className="w-4 h-4 text-green-600" />
              ) : (
                <ArrowDownRight className="w-4 h-4 text-red-600" />
              )}
              <span
                className={`text-sm font-medium ${
                  stat.trendUp ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {stat.trend}
              </span>
              <span className="text-sm text-gray-500">vs vorige maand</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Active Users Chart */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Actieve Gebruikers
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={usageHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getDate()}/${date.getMonth() + 1}`;
                  }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="active_users"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Storage Chart */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Opslaggebruik
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={usageHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getDate()}/${date.getMonth() + 1}`;
                  }}
                />
                <YAxis tick={{ fontSize: 12 }} unit=" GB" />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="storage_gb"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Snelle Acties
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <a
            href="/users"
            className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-center"
          >
            <Users className="w-8 h-8 text-primary-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Gebruiker Toevoegen</p>
          </a>
          <a
            href="/apps"
            className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-center"
          >
            <Grid3X3 className="w-8 h-8 text-primary-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Apps Beheren</p>
          </a>
          <a
            href="/settings"
            className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-center"
          >
            <HardDrive className="w-8 h-8 text-primary-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Opslag Upgraden</p>
          </a>
          <a
            href="https://docs.eusuite.eu"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-center"
          >
            <TrendingUp className="w-8 h-8 text-primary-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Documentatie</p>
          </a>
        </div>
      </div>
    </div>
  );
}
