import { useQuery } from '@tanstack/react-query'
import {
  BuildingOffice2Icon,
  UsersIcon,
  CurrencyEuroIcon,
  CloudIcon,
  TicketIcon,
  DocumentTextIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler,
} from 'chart.js'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import apiClient from '@/api/client'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import { clsx } from 'clsx'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
)

interface DashboardStats {
  total_tenants: number
  active_tenants: number
  total_users: number
  mrr: number
  arr: number
  total_storage_gb: number
  open_tickets: number
  pending_invoices: number
}

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const { data } = await apiClient.get('/dashboard/stats')
      return data
    },
  })

  const { data: revenueData } = useQuery({
    queryKey: ['revenue-by-month'],
    queryFn: async () => {
      const { data } = await apiClient.get('/dashboard/revenue-by-month?months=6')
      return data
    },
  })

  const { data: growthData } = useQuery({
    queryKey: ['tenant-growth'],
    queryFn: async () => {
      const { data } = await apiClient.get('/dashboard/tenant-growth?months=6')
      return data
    },
  })

  const { data: subscriptionBreakdown } = useQuery({
    queryKey: ['subscription-breakdown'],
    queryFn: async () => {
      const { data } = await apiClient.get('/dashboard/subscription-breakdown')
      return data
    },
  })

  const { data: recentActivity } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: async () => {
      const { data } = await apiClient.get('/dashboard/recent-activity?limit=10')
      return data
    },
  })

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const statCards = [
    {
      name: 'Total Tenants',
      value: stats?.total_tenants || 0,
      subValue: `${stats?.active_tenants || 0} active`,
      icon: BuildingOffice2Icon,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      trend: '+12%',
      trendUp: true,
    },
    {
      name: 'Total Users',
      value: stats?.total_users || 0,
      icon: UsersIcon,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      trend: '+8%',
      trendUp: true,
    },
    {
      name: 'Monthly Recurring Revenue',
      value: `€${(stats?.mrr || 0).toLocaleString()}`,
      subValue: `€${(stats?.arr || 0).toLocaleString()} ARR`,
      icon: CurrencyEuroIcon,
      iconBg: 'bg-primary-100',
      iconColor: 'text-primary-600',
      trend: '+15%',
      trendUp: true,
    },
    {
      name: 'Total Storage',
      value: `${(stats?.total_storage_gb || 0).toFixed(1)} GB`,
      icon: CloudIcon,
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
    },
    {
      name: 'Open Tickets',
      value: stats?.open_tickets || 0,
      icon: TicketIcon,
      iconBg: 'bg-yellow-100',
      iconColor: 'text-yellow-600',
      trend: '-5%',
      trendUp: false,
    },
    {
      name: 'Pending Invoices',
      value: stats?.pending_invoices || 0,
      icon: DocumentTextIcon,
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
    },
  ]

  // Revenue chart data
  const revenueChartData = {
    labels: revenueData?.map((d: any) => d.month) || [],
    datasets: [
      {
        label: 'Revenue',
        data: revenueData?.map((d: any) => d.revenue) || [],
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  }

  // Growth chart data
  const growthChartData = {
    labels: growthData?.map((d: any) => d.month) || [],
    datasets: [
      {
        label: 'New Tenants',
        data: growthData?.map((d: any) => d.new_tenants) || [],
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
      },
      {
        label: 'Churned',
        data: growthData?.map((d: any) => d.churned_tenants) || [],
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
      },
    ],
  }

  // Subscription breakdown chart
  const subscriptionChartData = {
    labels: Object.keys(subscriptionBreakdown?.by_status || {}),
    datasets: [
      {
        data: Object.values(subscriptionBreakdown?.by_status || {}),
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(99, 102, 241, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(156, 163, 175, 0.8)',
        ],
      },
    ],
  }

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of the EUSuite platform</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat) => (
          <div key={stat.name} className="stat-card">
            <div className={clsx('stat-icon', stat.iconBg)}>
              <stat.icon className={clsx('h-6 w-6', stat.iconColor)} />
            </div>
            <div className="flex-1">
              <p className="stat-label">{stat.name}</p>
              <div className="flex items-baseline gap-2">
                <p className="stat-value">{stat.value}</p>
                {stat.trend && (
                  <span
                    className={clsx(
                      'text-sm font-medium flex items-center',
                      stat.trendUp ? 'text-green-600' : 'text-red-600'
                    )}
                  >
                    {stat.trendUp ? (
                      <ArrowTrendingUpIcon className="h-4 w-4 mr-0.5" />
                    ) : (
                      <ArrowTrendingDownIcon className="h-4 w-4 mr-0.5" />
                    )}
                    {stat.trend}
                  </span>
                )}
              </div>
              {stat.subValue && (
                <p className="text-sm text-gray-500 mt-0.5">{stat.subValue}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue chart */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h3>
          <div className="h-64">
            <Line
              data={revenueChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      callback: (value) => `€${value}`,
                    },
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Growth chart */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tenant Growth</h3>
          <div className="h-64">
            <Bar
              data={growthChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'bottom' },
                },
                scales: {
                  y: { beginAtZero: true },
                },
              }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Subscription breakdown */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Subscription Status</h3>
          <div className="h-48 flex items-center justify-center">
            <Doughnut
              data={subscriptionChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'bottom' },
                },
              }}
            />
          </div>
        </div>

        {/* Recent activity */}
        <div className="card lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {recentActivity?.map((activity: any) => (
              <div
                key={activity.id}
                className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={clsx(
                      'w-2 h-2 rounded-full',
                      activity.status === 'success' ? 'bg-green-500' : 'bg-red-500'
                    )}
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                    <p className="text-xs text-gray-500">
                      {activity.resource_type} • {activity.resource_id}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(activity.created_at).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
