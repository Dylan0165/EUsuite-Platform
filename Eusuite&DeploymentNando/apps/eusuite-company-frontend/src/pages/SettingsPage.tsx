import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import apiClient from '@/api/client'
import LoadingSpinner from '@/components/common/LoadingSpinner'

interface Settings {
  // Security
  mfa_required: boolean
  session_timeout_minutes: number
  password_min_length: number
  password_require_uppercase: boolean
  password_require_lowercase: boolean
  password_require_numbers: boolean
  password_require_symbols: boolean
  max_login_attempts: number
  lockout_duration_minutes: number
  
  // Notifications
  email_notifications_enabled: boolean
  notify_on_user_created: boolean
  notify_on_storage_warning: boolean
  notify_on_deployment_status: boolean
  storage_warning_threshold: number
  webhook_url: string | null
  
  // Locale
  default_timezone: string
  default_language: string
  date_format: string
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'security' | 'notifications' | 'locale'>('security')

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    setIsLoading(true)
    try {
      const response = await apiClient.get('/settings')
      setSettings(response.data)
    } catch {
      // Mock data
      setSettings({
        mfa_required: false,
        session_timeout_minutes: 480,
        password_min_length: 8,
        password_require_uppercase: true,
        password_require_lowercase: true,
        password_require_numbers: true,
        password_require_symbols: false,
        max_login_attempts: 5,
        lockout_duration_minutes: 30,
        email_notifications_enabled: true,
        notify_on_user_created: true,
        notify_on_storage_warning: true,
        notify_on_deployment_status: true,
        storage_warning_threshold: 80,
        webhook_url: null,
        default_timezone: 'Europe/Amsterdam',
        default_language: 'en',
        date_format: 'DD-MM-YYYY',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!settings) return

    setIsSaving(true)
    try {
      await apiClient.put('/settings', settings)
      toast.success('Settings saved successfully')
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading || !settings) {
    return (
      <div className="py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const tabs = [
    { id: 'security', name: 'Security' },
    { id: 'notifications', name: 'Notifications' },
    { id: 'locale', name: 'Locale' },
  ] as const

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 mt-1">Configure your organization settings</p>
        </div>
        <button onClick={handleSave} disabled={isSaving} className="btn btn-primary">
          {isSaving ? <LoadingSpinner size="sm" /> : 'Save Changes'}
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-brand-primary text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              style={{
                borderColor: activeTab === tab.id ? 'var(--brand-primary)' : undefined,
              }}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Security settings */}
      {activeTab === 'security' && (
        <div className="card space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Authentication</h3>
            <div className="space-y-4">
              <label className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Require MFA</p>
                  <p className="text-sm text-gray-500">
                    Require two-factor authentication for all users
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.mfa_required}
                  onChange={(e) =>
                    setSettings({ ...settings, mfa_required: e.target.checked })
                  }
                  className="h-5 w-5 rounded"
                />
              </label>

              <div className="form-group">
                <label className="form-label">Session Timeout (minutes)</label>
                <input
                  type="number"
                  min={5}
                  className="form-input w-32"
                  value={settings.session_timeout_minutes}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      session_timeout_minutes: parseInt(e.target.value) || 480,
                    })
                  }
                />
              </div>

              <div className="form-group">
                <label className="form-label">Max Login Attempts</label>
                <input
                  type="number"
                  min={1}
                  className="form-input w-32"
                  value={settings.max_login_attempts}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      max_login_attempts: parseInt(e.target.value) || 5,
                    })
                  }
                />
              </div>

              <div className="form-group">
                <label className="form-label">Lockout Duration (minutes)</label>
                <input
                  type="number"
                  min={1}
                  className="form-input w-32"
                  value={settings.lockout_duration_minutes}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      lockout_duration_minutes: parseInt(e.target.value) || 30,
                    })
                  }
                />
              </div>
            </div>
          </div>

          <hr />

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Password Policy</h3>
            <div className="space-y-4">
              <div className="form-group">
                <label className="form-label">Minimum Length</label>
                <input
                  type="number"
                  min={6}
                  max={32}
                  className="form-input w-32"
                  value={settings.password_min_length}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      password_min_length: parseInt(e.target.value) || 8,
                    })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.password_require_uppercase}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        password_require_uppercase: e.target.checked,
                      })
                    }
                    className="h-4 w-4 rounded"
                  />
                  <span className="text-sm">Require uppercase</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.password_require_lowercase}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        password_require_lowercase: e.target.checked,
                      })
                    }
                    className="h-4 w-4 rounded"
                  />
                  <span className="text-sm">Require lowercase</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.password_require_numbers}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        password_require_numbers: e.target.checked,
                      })
                    }
                    className="h-4 w-4 rounded"
                  />
                  <span className="text-sm">Require numbers</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.password_require_symbols}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        password_require_symbols: e.target.checked,
                      })
                    }
                    className="h-4 w-4 rounded"
                  />
                  <span className="text-sm">Require symbols</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notification settings */}
      {activeTab === 'notifications' && (
        <div className="card space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Email Notifications</h3>
            <div className="space-y-4">
              <label className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Enable Email Notifications</p>
                  <p className="text-sm text-gray-500">
                    Send email notifications for important events
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.email_notifications_enabled}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      email_notifications_enabled: e.target.checked,
                    })
                  }
                  className="h-5 w-5 rounded"
                />
              </label>

              <label className="flex items-center justify-between">
                <span className="text-sm">Notify on user created</span>
                <input
                  type="checkbox"
                  checked={settings.notify_on_user_created}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      notify_on_user_created: e.target.checked,
                    })
                  }
                  className="h-4 w-4 rounded"
                />
              </label>

              <label className="flex items-center justify-between">
                <span className="text-sm">Notify on storage warning</span>
                <input
                  type="checkbox"
                  checked={settings.notify_on_storage_warning}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      notify_on_storage_warning: e.target.checked,
                    })
                  }
                  className="h-4 w-4 rounded"
                />
              </label>

              <label className="flex items-center justify-between">
                <span className="text-sm">Notify on deployment status changes</span>
                <input
                  type="checkbox"
                  checked={settings.notify_on_deployment_status}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      notify_on_deployment_status: e.target.checked,
                    })
                  }
                  className="h-4 w-4 rounded"
                />
              </label>

              <div className="form-group">
                <label className="form-label">Storage Warning Threshold (%)</label>
                <input
                  type="number"
                  min={50}
                  max={99}
                  className="form-input w-32"
                  value={settings.storage_warning_threshold}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      storage_warning_threshold: parseInt(e.target.value) || 80,
                    })
                  }
                />
              </div>
            </div>
          </div>

          <hr />

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Webhook</h3>
            <div className="form-group">
              <label className="form-label">Webhook URL</label>
              <input
                type="url"
                className="form-input"
                placeholder="https://your-webhook-endpoint.com/events"
                value={settings.webhook_url || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    webhook_url: e.target.value || null,
                  })
                }
              />
              <p className="text-xs text-gray-500 mt-1">
                Receive event notifications via webhook
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Locale settings */}
      {activeTab === 'locale' && (
        <div className="card space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Regional Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="form-group">
                <label className="form-label">Timezone</label>
                <select
                  className="form-input"
                  value={settings.default_timezone}
                  onChange={(e) =>
                    setSettings({ ...settings, default_timezone: e.target.value })
                  }
                >
                  <option value="Europe/Amsterdam">Europe/Amsterdam</option>
                  <option value="Europe/London">Europe/London</option>
                  <option value="Europe/Paris">Europe/Paris</option>
                  <option value="Europe/Berlin">Europe/Berlin</option>
                  <option value="America/New_York">America/New_York</option>
                  <option value="America/Los_Angeles">America/Los_Angeles</option>
                  <option value="UTC">UTC</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Language</label>
                <select
                  className="form-input"
                  value={settings.default_language}
                  onChange={(e) =>
                    setSettings({ ...settings, default_language: e.target.value })
                  }
                >
                  <option value="en">English</option>
                  <option value="nl">Nederlands</option>
                  <option value="de">Deutsch</option>
                  <option value="fr">Français</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Date Format</label>
                <select
                  className="form-input"
                  value={settings.date_format}
                  onChange={(e) =>
                    setSettings({ ...settings, date_format: e.target.value })
                  }
                >
                  <option value="DD-MM-YYYY">DD-MM-YYYY</option>
                  <option value="MM-DD-YYYY">MM-DD-YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
