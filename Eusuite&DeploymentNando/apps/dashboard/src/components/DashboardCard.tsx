import type { LucideIcon } from 'lucide-react';

interface DashboardCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  onClick: () => void;
  color: string;
  badge?: number;
}

const colorClasses = {
  blue: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'hover:border-blue-500 dark:hover:border-blue-400',
    accent: 'bg-blue-500 dark:bg-blue-400',
  },
  green: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-600 dark:text-green-400',
    border: 'hover:border-green-500 dark:hover:border-green-400',
    accent: 'bg-green-500 dark:bg-green-400',
  },
  purple: {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-600 dark:text-purple-400',
    border: 'hover:border-purple-500 dark:hover:border-purple-400',
    accent: 'bg-purple-500 dark:bg-purple-400',
  },
  orange: {
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    text: 'text-orange-600 dark:text-orange-400',
    border: 'hover:border-orange-500 dark:hover:border-orange-400',
    accent: 'bg-orange-500 dark:bg-orange-400',
  },
  rose: {
    bg: 'bg-rose-100 dark:bg-rose-900/30',
    text: 'text-rose-600 dark:text-rose-400',
    border: 'hover:border-rose-500 dark:hover:border-rose-400',
    accent: 'bg-rose-500 dark:bg-rose-400',
  },
  emerald: {
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'hover:border-emerald-500 dark:hover:border-emerald-400',
    accent: 'bg-emerald-500 dark:bg-emerald-400',
  },
  amber: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'hover:border-amber-500 dark:hover:border-amber-400',
    accent: 'bg-amber-500 dark:bg-amber-400',
  },
};

export const DashboardCard = ({
  title,
  description,
  icon: Icon,
  onClick,
  color,
  badge,
}: DashboardCardProps) => {
  const colors = colorClasses[color as keyof typeof colorClasses] || colorClasses.blue;

  return (
    <button
      onClick={onClick}
      className={`group relative bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl dark:shadow-gray-900/50 transition-all duration-300 p-6 text-left border-2 border-transparent ${colors.border} hover:-translate-y-1`}
    >
      {/* Badge */}
      {badge !== undefined && badge > 0 && (
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full min-w-[24px] text-center">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
      <div className={`inline-flex p-3 rounded-lg ${colors.bg} ${colors.text} mb-4 transition-colors duration-200`}>
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 transition-colors duration-200">
        {title}
      </h3>
      <p className="text-gray-600 dark:text-gray-400 text-sm transition-colors duration-200">
        {description}
      </p>
      <div className={`absolute bottom-0 left-0 right-0 h-1 ${colors.accent} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 rounded-b-xl`}></div>
    </button>
  );
};
