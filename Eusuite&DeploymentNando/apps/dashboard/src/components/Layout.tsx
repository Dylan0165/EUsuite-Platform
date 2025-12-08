import type { ReactNode } from 'react';
import type { User } from '../types/auth';

interface LayoutProps {
  children: ReactNode;
  user: User;
  onLogout: () => void;
}

export const Layout = ({ children, user, onLogout }: LayoutProps) => {
  // App links for the dashboard
  const apps = [
    { name: 'EUType', icon: '📝', url: 'http://192.168.124.50:30081', color: 'bg-rose-900' },
    { name: 'EUCloud', icon: '☁️', url: 'http://192.168.124.50:30080', color: 'bg-blue-600' },
    { name: 'EUMail', icon: '✉️', url: 'http://192.168.124.50:30082/mail', color: 'bg-purple-600' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header - Rolex Green/Gold Theme */}
      <header className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-900 shadow-lg border-b-2 border-amber-500/30">
        <div className="px-4 lg:px-6">
          <div className="flex justify-between items-center h-18 py-3">
            {/* Logo */}
            <div className="flex items-center gap-4">
              <img src="/eusuite-logo.png" alt="EUsuite" className="h-10" />
              <div>
                <span className="text-2xl font-bold text-amber-400 tracking-wider">
                  EUSUITE
                </span>
                <span className="ml-3 px-3 py-1 rounded bg-amber-500/20 text-amber-300 text-xs font-semibold tracking-widest border border-amber-500/30">
                  DASHBOARD
                </span>
              </div>
            </div>

            {/* Navigation & User */}
            <div className="flex items-center gap-6">
              {/* App Links */}
              <nav className="hidden md:flex items-center gap-2">
                {apps.map((app) => (
                  <a
                    key={app.name}
                    href={app.url}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-all duration-200 border border-white/10"
                  >
                    <span>{app.icon}</span>
                    <span>{app.name}</span>
                  </a>
                ))}
              </nav>

              {/* Divider */}
              <div className="h-8 w-px bg-white/20 hidden md:block"></div>

              {/* User menu */}
              <div className="flex items-center gap-4">
                <span className="text-amber-200/90 text-sm font-medium">
                  {user?.username || user?.email || 'Gebruiker'}
                </span>
                <button
                  onClick={onLogout}
                  className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 border border-amber-500/30"
                >
                  Uitloggen
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer - Premium feel */}
      <footer className="bg-emerald-950 border-t border-amber-500/20 py-4 mt-auto">
        <div className="px-4 text-center">
          <p className="text-amber-200/60 text-sm tracking-wide">
            © 2025 EUsuite Platform • Premium Cloud Solutions
          </p>
        </div>
      </footer>
    </div>
  );
};
