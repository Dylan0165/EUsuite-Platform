import { useEffect, useState } from 'react'
import {
  UsersIcon,
  CloudIcon,
  CircleStackIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar, Doughnut } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
)

interface DashboardStats {
  total_users: number
  active_users: number
  total_storage_gb: number
  used_storage_gb: number
  storage_percentage: number
  active_deployments: number
  total_deployments: number
  recent_logins: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [, setIsLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      // For now, use mock data - replace with actual API call
      setStats({
        total_users: 156,
        active_users: 142,
        total_storage_gb: 100,
        used_storage_gb: 42,
        storage_percentage: 42,
        active_deployments: 4,
        total_deployments: 5,
        recent_logins: 87,
      })
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const statCards = [
    {
      name: 'Total Users',
      value: stats?.total_users || 0,
      subtext: `${stats?.active_users || 0} active`,
      icon: UsersIcon,
      color: 'bg-blue-500',
    },
    {
      name: 'Active Deployments',
      value: stats?.active_deployments || 0,
      subtext: `of ${stats?.total_deployments || 0} apps`,
      icon: CloudIcon,
      color: 'bg-green-500',
    },
    {
      name: 'Storage Used',
      value: `${stats?.used_storage_gb || 0} GB`,
      subtext: `${stats?.storage_percentage || 0}% of ${stats?.total_storage_gb || 100} GB`,
      icon: CircleStackIcon,
      color: 'bg-purple-500',
    },
    {
      name: 'Recent Logins',
      value: stats?.recent_logins || 0,
      subtext: 'Last 24 hours',
      icon: ArrowTrendingUpIcon,
      color: 'bg-orange-500',
    },
  ]

  const loginChartData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Logins',
        data: [65, 59, 80, 81, 56, 25, 30],
        backgroundColor: 'rgba(30, 86, 49, 0.8)',
        borderRadius: 4,
      },
    ],
  }

  const storageChartData = {
    labels: ['EUCloud', 'EUMail', 'EUGroups', 'EUType', 'Available'],
    datasets: [
      {
        data: [25, 10, 5, 2, 58],
        backgroundColor: [
          '#1e5631',
          '#d4af37',
          '#3b82f6',
          '#8b5cf6',
          '#e5e7eb',
        ],
        borderWidth: 0,
      },
    ],
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of your organization</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <div key={stat.name} className="stat-card">
            <div className="flex items-center gap-4">
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{stat.name}</p>
                <p className="stat-value text-2xl">{stat.value}</p>
                <p className="text-xs text-gray-400">{stat.subtext}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Login activity chart */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Login Activity</h2>
            <span className="text-sm text-gray-500">Last 7 days</span>
          </div>
          <div className="h-64">
            <Bar
              data={loginChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    grid: { color: '#f3f4f6' },
                  },
                  x: {
                    grid: { display: false },
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Storage breakdown chart */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Storage Breakdown</h2>
            <span className="text-sm text-gray-500">By application</span>
          </div>
          <div className="h-64 flex items-center justify-center">
            <Doughnut
              data={storageChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'right',
                    labels: {
                      usePointStyle: true,
                      padding: 20,
                    },
                  },
                },
                cutout: '60%',
              }}
            />
          </div>
        </div>
      </div>

      {/* Quick actions & Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick actions */}
        <div className="card">
          <h2 className="card-title mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <a
              href="/users"
              className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <UsersIcon className="h-6 w-6 text-gray-400" />
              <span className="text-sm font-medium">Add User</span>
            </a>
            <a
              href="/deployments"
              className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <CloudIcon className="h-6 w-6 text-gray-400" />
              <span className="text-sm font-medium">Deploy App</span>
            </a>
            <a
              href="/branding"
              className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
              <span className="text-sm font-medium">Customize</span>
            </a>
            <a
              href="/settings"
              className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-sm font-medium">Settings</span>
            </a>
          </div>
        </div>

        {/* Recent activity */}
        <div className="card">
          <h2 className="card-title mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {[
              { action: 'User created', user: 'admin@company.com', time: '2 minutes ago' },
              { action: 'EUCloud deployed', user: 'admin@company.com', time: '1 hour ago' },
              { action: 'Branding updated', user: 'admin@company.com', time: '3 hours ago' },
              { action: 'User login', user: 'john@company.com', time: '5 hours ago' },
            ].map((activity, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                  <p className="text-xs text-gray-500">{activity.user}</p>
                </div>
                <span className="text-xs text-gray-400">{activity.time}</span>
              </div>
            ))}
          </div>
          <a
            href="/audit"
            className="block text-center text-sm font-medium mt-4 py-2 hover:underline"
            style={{ color: 'var(--brand-primary)' }}
          >
            View all activity →
          </a>
        </div>
      </div>
    </div>
  )
}
