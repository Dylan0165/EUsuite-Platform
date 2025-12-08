import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Mail, Send, PenSquare, Home, Inbox } from 'lucide-react';
import { DASHBOARD_URL } from '../config/constants';

interface User {
  user_id: string;
  email: string;
  username?: string;
}

interface LayoutProps {
  children: ReactNode;
  user: User;
}

export function Layout({ children, user }: LayoutProps) {
  const location = useLocation();

  const navItems = [
    { path: '/mail', label: 'Inbox', icon: Inbox },
    { path: '/mail/sent', label: 'Verzonden', icon: Send },
    { path: '/mail/new', label: 'Nieuw', icon: PenSquare },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-rose-500 via-pink-500 to-rose-400 shadow-lg">
        <div className="px-4 lg:px-6">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center gap-4">
              <img src="/eusuite-logo.png" alt="EUSuite" className="h-10" />
              <div className="flex items-center gap-2">
                <Mail className="h-6 w-6 text-white/90" />
                <span className="text-2xl font-bold text-white tracking-wider drop-shadow">
                  EUMAIL
                </span>
                <span className="ml-2 px-2 py-0.5 rounded-full bg-white/20 text-white text-xs font-semibold backdrop-blur-sm">
                  MAIL
                </span>
              </div>
            </div>

            {/* User & Dashboard Link */}
            <div className="flex items-center gap-4">
              <a
                href={DASHBOARD_URL}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-sm font-medium transition-all backdrop-blur-sm"
              >
                <Home size={18} />
                <span>Dashboard</span>
              </a>
              <span className="text-white/90 text-sm font-medium">
                {user.username || user.email}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-64 bg-white/80 backdrop-blur-sm border-r border-rose-100 p-4 shadow-sm">
          <Link
            to="/mail/new"
            className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white rounded-xl font-semibold mb-6 transition-all shadow-md hover:shadow-lg"
          >
            <PenSquare size={20} />
            Nieuwe Mail
          </Link>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-rose-100 to-pink-100 text-rose-700 font-medium shadow-sm'
                      : 'text-gray-600 hover:bg-rose-50 hover:text-rose-600'
                  }`}
                >
                  <item.icon size={20} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Page Content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
