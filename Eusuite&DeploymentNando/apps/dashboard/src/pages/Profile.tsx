import { useAuth } from '../hooks/useAuth';
import { User as UserIcon, Mail } from 'lucide-react';

export const Profile = () => {
  const { user } = useAuth();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 transition-colors duration-200">
          Profile
        </h2>
        <p className="text-gray-600 dark:text-gray-400 transition-colors duration-200">
          View and manage your account information
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md dark:shadow-gray-900/50 p-8 max-w-2xl transition-colors duration-200">
        <div className="space-y-6">
          <div className="flex items-center space-x-4 pb-6 border-b border-gray-200 dark:border-gray-700">
            <div className="bg-blue-100 dark:bg-blue-900/30 rounded-full p-4 transition-colors duration-200">
              <UserIcon className="h-12 w-12 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white transition-colors duration-200">
                {user?.username}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 transition-colors duration-200">
                EUsuite User
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <UserIcon className="h-5 w-5 text-gray-400 dark:text-gray-500 mt-1" />
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Username</p>
                <p className="text-lg text-gray-900 dark:text-white">{user?.username}</p>
              </div>
            </div>

            {user?.email && (
              <div className="flex items-start space-x-3">
                <Mail className="h-5 w-5 text-gray-400 dark:text-gray-500 mt-1" />
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</p>
                  <p className="text-lg text-gray-900 dark:text-white">{user.email}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
