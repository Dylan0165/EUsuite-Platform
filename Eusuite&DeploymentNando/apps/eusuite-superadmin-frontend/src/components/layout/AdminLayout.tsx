import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import {
  HomeIcon,
  BuildingOffice2Icon,
  UsersIcon,
  CreditCardIcon,
  CloudIcon,
  TicketIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  ShieldCheckIcon,
  ServerStackIcon,
} from '@heroicons/react/24/outline'
import { useAuthStore } from '@/stores/authStore'

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Tenants', href: '/tenants', icon: BuildingOffice2Icon },
  { name: 'Plans', href: '/plans', icon: CreditCardIcon },
  { name: 'Deployments', href: '/deployments', icon: CloudIcon },
  { name: 'Kubernetes', href: '/kubernetes', icon: ServerStackIcon },
  { name: 'Invoices', href: '/invoices', icon: DocumentTextIcon },
  { name: 'Support Tickets', href: '/tickets', icon: TicketIcon },
  { name: 'Admins', href: '/admins', icon: UsersIcon },
  { name: 'Audit Logs', href: '/audit', icon: ChartBarIcon },
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
]

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-900/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-xl transform transition-transform duration-300 lg:hidden',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <ShieldCheckIcon className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">EUSuite Admin</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 text-gray-500 hover:text-gray-700"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <nav className="p-4 space-y-1">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                clsx('sidebar-link', isActive && 'active')
              }
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-1 bg-white border-r border-gray-200">
          {/* Logo */}
          <div className="flex items-center gap-2 h-16 px-6 border-b border-gray-200">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <ShieldCheckIcon className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">EUSuite Admin</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                end={item.href === '/'}
                className={({ isActive }) =>
                  clsx('sidebar-link', isActive && 'active')
                }
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </NavLink>
            ))}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold text-primary-700">
                  {user?.first_name?.[0]}
                  {user?.last_name?.[0]}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="sidebar-link w-full text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 flex items-center h-16 px-4 bg-white border-b border-gray-200 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-gray-500 hover:text-gray-700"
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
          <div className="flex items-center gap-2 ml-4">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <ShieldCheckIcon className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">EUSuite Admin</span>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
