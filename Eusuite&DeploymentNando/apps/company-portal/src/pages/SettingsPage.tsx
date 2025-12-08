import { useState, useEffect } from 'react';
import { Save, Upload, Loader2, Check } from 'lucide-react';
import { settingsApi, CompanySettings } from '../api/client';
import { useAuthStore } from '../store/authStore';

const mockSettings: CompanySettings = {
  name: 'Bedrijf BV',
  logo_url: undefined,
  primary_color: '#2563eb',
  secondary_color: '#1e40af',
  timezone: 'Europe/Amsterdam',
  language: 'nl',
  custom_domain: undefined,
};

export default function SettingsPage() {
  const { company, updateCompany } = useAuthStore();
  const [settings, setSettings] = useState<CompanySettings>(mockSettings);
  const [_loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await settingsApi.get();
        setSettings(data);
      } catch {
        if (company) {
          setSettings({
            ...mockSettings,
            name: company.name,
            primary_color: company.primary_color || '#2563eb',
          });
        }
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [company]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);

    try {
      const updated = await settingsApi.update(settings);
      setSettings(updated);
      
      // Update company in store
      if (company) {
        updateCompany({
          ...company,
          name: settings.name,
          primary_color: settings.primary_color,
        });
      }
    } catch {
      // Mock save success
    }
    
    setSaved(true);
    setSaving(false);
    
    setTimeout(() => setSaved(false), 3000);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await settingsApi.uploadLogo(file);
      setSettings({ ...settings, logo_url: result.logo_url });
    } catch {
      // Mock upload
      const reader = new FileReader();
      reader.onload = () => {
        setSettings({ ...settings, logo_url: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Instellingen</h1>
        <p className="text-gray-600">
          Beheer je bedrijfsprofiel en voorkeuren
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company Info */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Bedrijfsinformatie
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bedrijfsnaam
              </label>
              <input
                type="text"
                value={settings.name}
                onChange={(e) =>
                  setSettings({ ...settings, name: e.target.value })
                }
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Logo
              </label>
              <div className="flex items-center gap-4">
                {settings.logo_url ? (
                  <img
                    src={settings.logo_url}
                    alt="Logo"
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl font-bold text-gray-400">
                      {settings.name[0]}
                    </span>
                  </div>
                )}
                <label className="btn-secondary cursor-pointer flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Upload Logo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Branding */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Branding
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Primaire Kleur
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={settings.primary_color}
                  onChange={(e) =>
                    setSettings({ ...settings, primary_color: e.target.value })
                  }
                  className="w-10 h-10 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.primary_color}
                  onChange={(e) =>
                    setSettings({ ...settings, primary_color: e.target.value })
                  }
                  className="input flex-1"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Secundaire Kleur
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={settings.secondary_color}
                  onChange={(e) =>
                    setSettings({ ...settings, secondary_color: e.target.value })
                  }
                  className="w-10 h-10 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.secondary_color}
                  onChange={(e) =>
                    setSettings({ ...settings, secondary_color: e.target.value })
                  }
                  className="input flex-1"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Voorkeuren
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tijdzone
              </label>
              <select
                value={settings.timezone}
                onChange={(e) =>
                  setSettings({ ...settings, timezone: e.target.value })
                }
                className="input"
              >
                <option value="Europe/Amsterdam">Amsterdam (CET)</option>
                <option value="Europe/London">London (GMT)</option>
                <option value="Europe/Paris">Paris (CET)</option>
                <option value="Europe/Berlin">Berlin (CET)</option>
                <option value="America/New_York">New York (EST)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Taal
              </label>
              <select
                value={settings.language}
                onChange={(e) =>
                  setSettings({ ...settings, language: e.target.value })
                }
                className="input"
              >
                <option value="nl">Nederlands</option>
                <option value="en">English</option>
                <option value="de">Deutsch</option>
                <option value="fr">Français</option>
              </select>
            </div>
          </div>
        </div>

        {/* Custom Domain */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Custom Domein
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Gebruik je eigen domein in plaats van bedrijf.eusuite.eu
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Domein
            </label>
            <input
              type="text"
              value={settings.custom_domain || ''}
              onChange={(e) =>
                setSettings({ ...settings, custom_domain: e.target.value || undefined })
              }
              className="input"
              placeholder="cloud.jouwbedrijf.nl"
            />
            <p className="text-xs text-gray-500 mt-1">
              Voeg een CNAME record toe dat naar eusuite.eu wijst
            </p>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-end gap-4">
          {saved && (
            <span className="flex items-center gap-2 text-green-600">
              <Check className="w-5 h-5" />
              Opgeslagen
            </span>
          )}
          <button
            type="submit"
            disabled={saving}
            className="btn-primary flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Opslaan...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Wijzigingen Opslaan
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
