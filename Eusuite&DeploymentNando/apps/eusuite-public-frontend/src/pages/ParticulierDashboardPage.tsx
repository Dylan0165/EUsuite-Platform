import { FC, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import {
  CloudIcon,
  EnvelopeIcon,
  DocumentTextIcon,
  UsersIcon,
  Squares2X2Icon,
  CogIcon,
  ArrowTopRightOnSquareIcon,
  SparklesIcon,
  CircleStackIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';

// Central EUSuite Apps - toegankelijk voor particulieren
const EUSUITE_APPS = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    description: 'Centraal overzicht van al je EUSuite activiteit',
    icon: Squares2X2Icon,
    color: 'bg-indigo-500',
    url: 'https://dashboard.eusuite.com',
    available: true,
  },
  {
    id: 'eucloud',
    name: 'EUCloud',
    description: 'Veilige cloudopslag voor al je bestanden',
    icon: CloudIcon,
    color: 'bg-blue-500',
    url: 'https://cloud.eusuite.com',
    available: true,
    storage: '5 GB',
  },
  {
    id: 'eumail',
    name: 'EUMail',
    description: 'Professionele email in de EU cloud',
    icon: EnvelopeIcon,
    color: 'bg-green-500',
    url: 'https://mail.eusuite.com',
    available: true,
  },
  {
    id: 'eutype',
    name: 'EUType',
    description: 'Online documenten bewerken en delen',
    icon: DocumentTextIcon,
    color: 'bg-purple-500',
    url: 'https://type.eusuite.com',
    available: true,
  },
  {
    id: 'eugroups',
    name: 'EUGroups',
    description: 'Samenwerken met familie en vrienden',
    icon: UsersIcon,
    color: 'bg-yellow-500',
    url: 'https://groups.eusuite.com',
    available: true,
  },
];

// Reserved for future subscription plan display
const _SUBSCRIPTION_PLANS = [
  {
    id: 'gratis',
    name: 'Gratis',
    price: 0,
    storage: 5,
    features: ['5 GB opslag', 'Alle basis apps', 'EU gehost', '1 gebruiker'],
    current: true,
  },
  {
    id: 'particulier-pro',
    name: 'Pro',
    price: 4.99,
    storage: 100,
    features: ['100 GB opslag', 'Alle apps', 'Priority support', 'Offline sync'],
    recommended: true,
  },
  {
    id: 'particulier-familie',
    name: 'Familie',
    price: 9.99,
    storage: 500,
    features: ['500 GB opslag', 'Tot 6 gezinsleden', 'Gedeelde folders', 'Alle features'],
  },
];

const ParticulierDashboardPage: FC = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  if (!user) return null;

  const storageUsed = 1.2; // GB - zou van API komen
  const storageTotal = 5; // GB - gebaseerd op plan
  const storagePercent = (storageUsed / storageTotal) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center">
                <span className="text-white font-bold text-lg">EU</span>
              </div>
              <span className="font-bold text-xl text-gray-900">EUSuite</span>
            </div>
            
            <div className="flex items-center gap-4">
              <Link to="/settings" className="text-gray-500 hover:text-gray-700">
                <CogIcon className="h-6 w-6" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{user.first_name} {user.last_name}</p>
                  <p className="text-xs text-gray-500">Particulier Account</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                  <span className="text-primary-600 font-medium">
                    {user.first_name?.[0]}{user.last_name?.[0]}
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  logout();
                  navigate('/');
                }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Uitloggen
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Welkom terug, {user.first_name}! 👋
          </h1>
          <p className="text-gray-600 mt-1">
            Toegang tot al je EUSuite applicaties
          </p>
        </div>

        {/* Storage & Subscription Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Storage Card */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <CircleStackIcon className="h-5 w-5 text-blue-500" />
                Opslagruimte
              </h2>
              <Link to="/storage" className="text-sm text-primary-600 hover:text-primary-700">
                Beheren →
              </Link>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="flex-1">
                <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all"
                    style={{ width: `${storagePercent}%` }}
                  />
                </div>
                <p className="mt-2 text-sm text-gray-600">
                  <span className="font-medium text-gray-900">{storageUsed} GB</span> van {storageTotal} GB gebruikt
                </p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-gray-900">{storageTotal - storageUsed}</p>
                <p className="text-sm text-gray-500">GB vrij</p>
              </div>
            </div>
            
            {storagePercent > 80 && (
              <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-sm text-yellow-800">
                  ⚠️ Je opslagruimte raakt vol. <Link to="/upgrade" className="font-medium underline">Upgrade naar Pro</Link> voor 100 GB.
                </p>
              </div>
            )}
          </div>

          {/* Current Plan Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Huidig Plan</h2>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary-600">Gratis</p>
              <p className="text-sm text-gray-500 mt-1">€0 / maand</p>
            </div>
            <Link
              to="/upgrade"
              className="mt-4 w-full btn-primary py-2 flex items-center justify-center gap-2"
            >
              <SparklesIcon className="h-4 w-4" />
              Upgrade naar Pro
            </Link>
          </div>
        </div>

        {/* Apps Grid */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Jouw Apps</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {EUSUITE_APPS.map((app) => (
              <a
                key={app.id}
                href={app.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md hover:border-primary-200 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className={`p-3 ${app.color} rounded-xl`}>
                    <app.icon className="h-6 w-6 text-white" />
                  </div>
                  <ArrowTopRightOnSquareIcon className="h-5 w-5 text-gray-300 group-hover:text-primary-500 transition-colors" />
                </div>
                <h3 className="mt-4 font-semibold text-gray-900">{app.name}</h3>
                <p className="mt-1 text-sm text-gray-500">{app.description}</p>
                {app.storage && (
                  <p className="mt-2 text-xs text-blue-600 font-medium">
                    {app.storage} opslag inbegrepen
                  </p>
                )}
              </a>
            ))}
          </div>
        </div>

        {/* Upgrade Section */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-8 text-white">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h2 className="text-2xl font-bold">Meer opslag nodig?</h2>
              <p className="mt-2 text-primary-100">
                Upgrade naar Pro voor 100 GB opslag, priority support en offline sync.
              </p>
            </div>
            <Link
              to="/upgrade"
              className="flex items-center gap-2 bg-white text-primary-600 px-6 py-3 rounded-lg font-semibold hover:bg-primary-50 transition-colors whitespace-nowrap"
            >
              Bekijk plannen
              <ArrowRightIcon className="h-5 w-5" />
            </Link>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            to="/settings"
            className="p-4 bg-white rounded-xl border border-gray-200 hover:border-primary-200 text-center"
          >
            <CogIcon className="h-6 w-6 mx-auto text-gray-400" />
            <p className="mt-2 text-sm font-medium text-gray-700">Instellingen</p>
          </Link>
          <Link
            to="/security"
            className="p-4 bg-white rounded-xl border border-gray-200 hover:border-primary-200 text-center"
          >
            <svg className="h-6 w-6 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <p className="mt-2 text-sm font-medium text-gray-700">Beveiliging</p>
          </Link>
          <Link
            to="/billing"
            className="p-4 bg-white rounded-xl border border-gray-200 hover:border-primary-200 text-center"
          >
            <svg className="h-6 w-6 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            <p className="mt-2 text-sm font-medium text-gray-700">Facturatie</p>
          </Link>
          <a
            href="https://help.eusuite.com"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 bg-white rounded-xl border border-gray-200 hover:border-primary-200 text-center"
          >
            <svg className="h-6 w-6 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="mt-2 text-sm font-medium text-gray-700">Help</p>
          </a>
        </div>
      </main>
    </div>
  );
};

export default ParticulierDashboardPage;
