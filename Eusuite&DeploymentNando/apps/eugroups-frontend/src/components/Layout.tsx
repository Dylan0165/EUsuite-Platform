import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Users, Home, MessageSquare, UserCircle, Search } from 'lucide-react';
import GlobalSearch from './GlobalSearch';
import { dmApi } from '../api/client';

export default function Layout() {
  const location = useLocation();
  const dashboardUrl = import.meta.env.VITE_DASHBOARD_URL || 'http://192.168.124.50:30080';
  const [showSearch, setShowSearch] = useState(false);
  const [unreadDMs, setUnreadDMs] = useState(0);

  useEffect(() => {
    // Load unread DM count
    const loadUnread = async () => {
      try {
        const response = await dmApi.getUnreadCount();
        setUnreadDMs(response.total_unread);
      } catch (err) {
        console.error('Failed to load unread count:', err);
      }
    };
    loadUnread();

    // Poll for updates every 30 seconds
    const interval = setInterval(loadUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
      if (e.key === 'Escape') {
        setShowSearch(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navItems = [
    { path: '/groups', icon: Users, label: 'Groups' },
    { path: '/messages', icon: MessageSquare, label: 'Messages', badge: unreadDMs },
    { path: '/contacts', icon: UserCircle, label: 'Contacts' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gradient-to-b from-primary-600 to-primary-700 text-white flex flex-col">
        {/* Logo */}
        <div className="p-4 border-b border-primary-500">
          <Link to="/groups" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <span className="text-xl font-bold">EUGroups</span>
          </Link>
        </div>

        {/* Search Button */}
        <div className="p-4">
          <button
            onClick={() => setShowSearch(true)}
            className="w-full flex items-center gap-3 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
          >
            <Search className="w-5 h-5" />
            <span className="flex-1 text-left text-white/80">Search</span>
            <kbd className="px-2 py-0.5 bg-white/10 rounded text-xs">⌘K</kbd>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                location.pathname.startsWith(item.path)
                  ? 'bg-white/20 text-white'
                  : 'hover:bg-white/10 text-white/80'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="flex-1">{item.label}</span>
              {item.badge && item.badge > 0 && (
                <span className="px-2 py-0.5 bg-red-500 rounded-full text-xs font-medium">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-primary-500 space-y-2">
          <a
            href={dashboardUrl}
            className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-white/10 text-white/80 transition-colors"
          >
            <Home className="w-5 h-5" />
            <span>Dashboard</span>
          </a>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>

      {/* Global Search Modal */}
      {showSearch && <GlobalSearch onClose={() => setShowSearch(false)} />}
    </div>
  );
}
