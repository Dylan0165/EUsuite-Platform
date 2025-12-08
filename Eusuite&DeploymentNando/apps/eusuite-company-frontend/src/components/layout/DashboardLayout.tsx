import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState, Fragment } from 'react'
import { Menu, Transition } from '@headlessui/react'
import {
  HomeIcon,
  UsersIcon,
  BuildingOfficeIcon,
  CloudIcon,
  PaintBrushIcon,
  CircleStackIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  BellIcon,
  Bars3Icon,
  XMarkIcon,
  ChevronDownIcon,
  ArrowRightOnRectangleIcon,
  ServerStackIcon,
} from '@heroicons/react/24/outline'
import { useAuthStore } from '@/stores/authStore'
import { useBrandingStore } from '@/stores/brandingStore'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Users', href: '/users', icon: UsersIcon },
  { name: 'Departments', href: '/departments', icon: BuildingOfficeIcon },
  { name: 'Deployments', href: '/deployments', icon: CloudIcon },
  { name: 'Kubernetes', href: '/kubernetes', icon: ServerStackIcon },
  { name: 'Branding', href: '/branding', icon: PaintBrushIcon },
  { name: 'Storage', href: '/storage', icon: CircleStackIcon },
  { name: 'Audit Logs', href: '/audit', icon: DocumentTextIcon },
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
]

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, logout } = useAuthStore()
  const { branding } = useBrandingStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      <Transition show={sidebarOpen} as={Fragment}>
        <div className="fixed inset-0 z-40 lg:hidden">
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div
              className="fixed inset-0 bg-gray-600 bg-opacity-75"
              onClick={() => setSidebarOpen(false)}
            />
          </Transition.Child>

          <Transition.Child
            as={Fragment}
            enter="transition ease-in-out duration-300 transform"
            enterFrom="-translate-x-full"
            enterTo="translate-x-0"
            leave="transition ease-in-out duration-300 transform"
            leaveFrom="translate-x-0"
            leaveTo="-translate-x-full"
          >
            <div className="relative flex w-full max-w-xs flex-1 flex-col bg-white">
              <div className="absolute right-0 top-0 -mr-12 pt-2">
                <button
                  type="button"
                  className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none"
                  onClick={() => setSidebarOpen(false)}
                >
                  <XMarkIcon className="h-6 w-6 text-white" />
                </button>
              </div>
              <SidebarContent branding={branding} />
            </div>
          </Transition.Child>
        </div>
      </Transition>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-1 flex-col border-r border-gray-200 bg-white">
          <SidebarContent branding={branding} />
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top header */}
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-4 border-b border-gray-200 bg-white px-4 shadow-sm">
          <button
            type="button"
            className="lg:hidden -m-2.5 p-2.5 text-gray-700"
            onClick={() => setSidebarOpen(true)}
          >
            <Bars3Icon className="h-6 w-6" />
          </button>

          <div className="flex flex-1 justify-end gap-4">
            {/* Notifications */}
            <button className="relative p-2 text-gray-500 hover:text-gray-700">
              <BellIcon className="h-6 w-6" />
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
            </button>

            {/* User menu */}
            <Menu as="div" className="relative">
              <Menu.Button className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-gray-100">
                <div className="h-8 w-8 rounded-full bg-brand-primary flex items-center justify-center text-white font-medium">
                  {user?.first_name?.charAt(0) || 'U'}
                </div>
                <span className="hidden sm:block text-sm font-medium text-gray-700">
                  {user?.first_name} {user?.last_name}
                </span>
                <ChevronDownIcon className="h-4 w-4 text-gray-500" />
              </Menu.Button>

              <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <Menu.Items className="dropdown-menu">
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={handleLogout}
                        className={`dropdown-item flex items-center gap-2 ${
                          active ? 'bg-gray-100' : ''
                        }`}
                      >
                        <ArrowRightOnRectangleIcon className="h-4 w-4" />
                        Sign out
                      </button>
                    )}
                  </Menu.Item>
                </Menu.Items>
              </Transition>
            </Menu>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function SidebarContent({ branding }: { branding: any }) {
  return (
    <div className="flex flex-1 flex-col overflow-y-auto pt-5 pb-4">
      {/* Logo */}
      <div className="flex shrink-0 items-center px-4 mb-6">
        {branding?.logo_url ? (
          <img
            className="h-10 w-auto"
            src={branding.logo_url}
            alt={branding.company_name_display || 'Company Logo'}
          />
        ) : (
          <div className="flex items-center gap-2">
            <div 
              className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold text-lg"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              EU
            </div>
            <span className="text-lg font-bold text-gray-900">
              {branding?.company_name_display || 'EUSuite'}
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
          >
            <item.icon className="h-5 w-5" />
            {item.name}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      {branding?.show_powered_by !== false && (
        <div className="px-4 py-4 border-t border-gray-200">
          <p className="text-xs text-gray-400 text-center">
            Powered by <span className="font-medium">EUSuite</span>
          </p>
        </div>
      )}
    </div>
  )
}
