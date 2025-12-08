import { LogOut, User as UserIcon, Moon, Sun } from 'lucide-react';
import type { User } from '../types/auth';
import { useTheme } from '../contexts/ThemeContext';

interface HeaderProps {
  user: User | null;
  onLogout: () => void;
}

export const Header = ({ user, onLogout }: HeaderProps) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400">EUsuite</h1>
          </div>

          {/* Right Side: Theme Toggle, User Info & Logout */}
          <div className="flex items-center space-x-4">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? (
                <Moon className="h-5 w-5 text-gray-700 dark:text-gray-300" />
              ) : (
                <Sun className="h-5 w-5 text-gray-700 dark:text-gray-300" />
              )}
            </button>

            {/* User Info & Logout */}
            {user && (
              <>
                <div className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
                  <UserIcon className="h-5 w-5" />
                  <span className="font-medium">{user.username}</span>
                </div>
                <button
                  onClick={onLogout}
                  className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 rounded-lg transition-colors duration-200"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
