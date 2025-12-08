import { Bell, Shield, Palette } from 'lucide-react';

const colorClasses = {
  blue: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-600 dark:text-blue-400',
  },
  red: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-600 dark:text-red-400',
  },
  purple: {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-600 dark:text-purple-400',
  },
};

export const Settings = () => {
  const settingsSections = [
    {
      icon: Bell,
      title: 'Notifications',
      description: 'Configure notification preferences',
      color: 'blue' as const,
    },
    {
      icon: Shield,
      title: 'Security',
      description: 'Manage security settings',
      color: 'red' as const,
    },
    {
      icon: Palette,
      title: 'Appearance',
      description: 'Customize theme and display',
      color: 'purple' as const,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 transition-colors duration-200">
          Settings
        </h2>
        <p className="text-gray-600 dark:text-gray-400 transition-colors duration-200">
          Manage your application preferences
        </p>
      </div>

      <div className="space-y-6">
        {settingsSections.map((section) => {
          const Icon = section.icon;
          const colors = colorClasses[section.color];
          return (
            <div
              key={section.title}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-md dark:shadow-gray-900/50 p-6 hover:shadow-lg transition-all duration-200"
            >
              <div className="flex items-center space-x-4">
                <div className={`${colors.bg} rounded-lg p-3 transition-colors duration-200`}>
                  <Icon className={`h-6 w-6 ${colors.text}`} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white transition-colors duration-200">
                    {section.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm transition-colors duration-200">
                    {section.description}
                  </p>
                </div>
                <button className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors duration-200">
                  Configure
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
