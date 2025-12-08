import { useState, useEffect } from 'react';
import {
  HardDrive,
  Mail,
  Video,
  FileText,
  ExternalLink,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import { appsApi, EUSuiteApp } from '../api/client';

const mockApps: EUSuiteApp[] = [
  {
    id: 'eucloud',
    name: 'EUCloud',
    description: 'Veilige cloud opslag met end-to-end encryptie',
    icon: 'HardDrive',
    enabled: true,
    url: 'https://cloud.bedrijf.eusuite.eu',
    status: 'active',
  },
  {
    id: 'eumail',
    name: 'EUMail',
    description: 'Professionele zakelijke e-mail met custom domein',
    icon: 'Mail',
    enabled: true,
    url: 'https://mail.bedrijf.eusuite.eu',
    status: 'active',
  },
  {
    id: 'eugroups',
    name: 'EUGroups',
    description: 'Video conferencing en team messaging',
    icon: 'Video',
    enabled: true,
    url: 'https://groups.bedrijf.eusuite.eu',
    status: 'active',
  },
  {
    id: 'eutype',
    name: 'EUType',
    description: 'Realtime document samenwerking',
    icon: 'FileText',
    enabled: false,
    status: 'inactive',
  },
];

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  HardDrive,
  Mail,
  Video,
  FileText,
};

const statusConfig = {
  active: { icon: CheckCircle, label: 'Actief', color: 'text-green-600 bg-green-50' },
  inactive: { icon: XCircle, label: 'Inactief', color: 'text-gray-600 bg-gray-100' },
  deploying: { icon: Clock, label: 'Deploying...', color: 'text-yellow-600 bg-yellow-50' },
  error: { icon: XCircle, label: 'Error', color: 'text-red-600 bg-red-50' },
};

export default function AppsPage() {
  const [apps, setApps] = useState<EUSuiteApp[]>(mockApps);
  const [_loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    const fetchApps = async () => {
      try {
        const data = await appsApi.list();
        setApps(data);
      } catch {
        console.log('Using mock data');
      } finally {
        setLoading(false);
      }
    };
    fetchApps();
  }, []);

  const handleToggle = async (appId: string, enabled: boolean) => {
    setToggling(appId);
    
    try {
      const updated = await appsApi.toggle(appId, enabled);
      setApps(apps.map((a) => (a.id === appId ? updated : a)));
    } catch {
      // Mock toggle
      setApps(
        apps.map((a) =>
          a.id === appId
            ? {
                ...a,
                enabled,
                status: enabled ? 'deploying' : 'inactive',
              }
            : a
        )
      );
      
      // Simulate deployment completion
      if (enabled) {
        setTimeout(() => {
          setApps((current) =>
            current.map((a) =>
              a.id === appId
                ? { ...a, status: 'active', url: `https://${appId}.bedrijf.eusuite.eu` }
                : a
            )
          );
        }, 3000);
      }
    } finally {
      setToggling(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Apps</h1>
        <p className="text-gray-600">
          Beheer welke EUSuite apps beschikbaar zijn voor je team
        </p>
      </div>

      {/* Apps Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {apps.map((app) => {
          const IconComponent = iconMap[app.icon] || HardDrive;
          const status = statusConfig[app.status];
          const StatusIcon = status.icon;

          return (
            <div key={app.id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl ${
                    app.enabled ? 'bg-primary-100' : 'bg-gray-100'
                  }`}>
                    <IconComponent className={`w-8 h-8 ${
                      app.enabled ? 'text-primary-600' : 'text-gray-400'
                    }`} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {app.name}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {app.description}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleToggle(app.id, !app.enabled)}
                  disabled={toggling === app.id}
                  className={`relative w-12 h-7 rounded-full transition-colors ${
                    app.enabled ? 'bg-primary-600' : 'bg-gray-300'
                  } ${toggling === app.id ? 'opacity-50' : ''}`}
                >
                  {toggling === app.id ? (
                    <Loader2 className="w-5 h-5 text-white absolute top-1 left-3 animate-spin" />
                  ) : (
                    <span
                      className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                        app.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  )}
                </button>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${status.color}`}>
                  <StatusIcon className="w-4 h-4" />
                  {status.label}
                </div>

                {app.enabled && app.url && app.status === 'active' && (
                  <a
                    href={app.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-primary-600 hover:underline"
                  >
                    Openen
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold text-blue-900">Hoe werkt het?</h3>
        <p className="text-blue-800 text-sm mt-2">
          Schakel apps in of uit voor je organisatie. Wanneer je een app inschakelt, 
          wordt deze automatisch gedeployed en beschikbaar gemaakt voor al je gebruikers. 
          Dit kan enkele minuten duren.
        </p>
        <ul className="mt-4 space-y-2 text-sm text-blue-800">
          <li className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span>Ingeschakelde apps zijn direct toegankelijk voor alle gebruikers</span>
          </li>
          <li className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-gray-500" />
            <span>Uitgeschakelde apps zijn niet zichtbaar voor gebruikers</span>
          </li>
          <li className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-yellow-600" />
            <span>Nieuwe deployments kunnen 2-5 minuten duren</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
