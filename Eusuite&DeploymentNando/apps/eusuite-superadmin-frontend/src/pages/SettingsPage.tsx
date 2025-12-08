import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Cog6ToothIcon,
  EnvelopeIcon,
  CreditCardIcon,
  ServerIcon,
  ShieldCheckIcon,
  PaintBrushIcon,
} from '@heroicons/react/24/outline'
import { Tab } from '@headlessui/react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import apiClient from '@/api/client'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import { clsx } from 'clsx'

interface SystemSettings {
  // General
  platform_name: string
  support_email: string
  default_timezone: string
  maintenance_mode: boolean
  
  // Email
  smtp_host: string
  smtp_port: number
  smtp_user: string
  smtp_from_name: string
  smtp_from_email: string
  
  // Payments
  stripe_publishable_key: string
  stripe_webhook_secret: string
  default_currency: string
  
  // Infrastructure
  k8s_namespace_prefix: string
  default_replicas: number
  default_cpu_request: string
  default_memory_request: string
  port_range_start: number
  port_range_end: number
  
  // Security
  session_timeout_minutes: number
  max_login_attempts: number
  password_min_length: number
  require_mfa_for_admins: boolean
  
  // Branding
  primary_color: string
  secondary_color: string
  logo_url: string
  favicon_url: string
}

export default function SettingsPage() {
  const queryClient = useQueryClient()
  const [selectedTab, setSelectedTab] = useState(0)

  const { data: settings, isLoading } = useQuery<SystemSettings>({
    queryKey: ['settings'],
    queryFn: async () => {
      const { data } = await apiClient.get('/settings')
      return data
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<SystemSettings>) => {
      return await apiClient.patch('/settings', data)
    },
    onSuccess: () => {
      toast.success('Settings saved successfully')
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to save settings')
    },
  })

  const tabs = [
    { name: 'General', icon: Cog6ToothIcon },
    { name: 'Email', icon: EnvelopeIcon },
    { name: 'Payments', icon: CreditCardIcon },
    { name: 'Infrastructure', icon: ServerIcon },
    { name: 'Security', icon: ShieldCheckIcon },
    { name: 'Branding', icon: PaintBrushIcon },
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
        <p className="text-gray-500 mt-1">Configure platform-wide settings</p>
      </div>

      {/* Settings tabs */}
      <Tab.Group selectedIndex={selectedTab} onChange={setSelectedTab}>
        <div className="flex gap-6">
          {/* Sidebar */}
          <Tab.List className="w-64 space-y-1">
            {tabs.map((tab) => (
              <Tab
                key={tab.name}
                className={({ selected }) =>
                  clsx(
                    'w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg transition-colors',
                    'focus:outline-none',
                    selected
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  )
                }
              >
                <tab.icon className="h-5 w-5" />
                {tab.name}
              </Tab>
            ))}
          </Tab.List>

          {/* Content */}
          <Tab.Panels className="flex-1">
            {/* General Settings */}
            <Tab.Panel>
              <GeneralSettingsForm settings={settings!} onSubmit={(data) => updateMutation.mutate(data)} isPending={updateMutation.isPending} />
            </Tab.Panel>

            {/* Email Settings */}
            <Tab.Panel>
              <EmailSettingsForm settings={settings!} onSubmit={(data) => updateMutation.mutate(data)} isPending={updateMutation.isPending} />
            </Tab.Panel>

            {/* Payment Settings */}
            <Tab.Panel>
              <PaymentSettingsForm settings={settings!} onSubmit={(data) => updateMutation.mutate(data)} isPending={updateMutation.isPending} />
            </Tab.Panel>

            {/* Infrastructure Settings */}
            <Tab.Panel>
              <InfrastructureSettingsForm settings={settings!} onSubmit={(data) => updateMutation.mutate(data)} isPending={updateMutation.isPending} />
            </Tab.Panel>

            {/* Security Settings */}
            <Tab.Panel>
              <SecuritySettingsForm settings={settings!} onSubmit={(data) => updateMutation.mutate(data)} isPending={updateMutation.isPending} />
            </Tab.Panel>

            {/* Branding Settings */}
            <Tab.Panel>
              <BrandingSettingsForm settings={settings!} onSubmit={(data) => updateMutation.mutate(data)} isPending={updateMutation.isPending} />
            </Tab.Panel>
          </Tab.Panels>
        </div>
      </Tab.Group>
    </div>
  )
}

interface FormProps {
  settings: SystemSettings
  onSubmit: (data: Partial<SystemSettings>) => void
  isPending: boolean
}

function GeneralSettingsForm({ settings, onSubmit, isPending }: FormProps) {
  const { register, handleSubmit } = useForm({
    defaultValues: {
      platform_name: settings.platform_name || 'EUSuite',
      support_email: settings.support_email || '',
      default_timezone: settings.default_timezone || 'Europe/Amsterdam',
      maintenance_mode: settings.maintenance_mode || false,
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="card space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">General Settings</h2>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">Platform Name</label>
        <input {...register('platform_name')} className="input w-full mt-1" />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">Support Email</label>
        <input {...register('support_email')} type="email" className="input w-full mt-1" />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">Default Timezone</label>
        <select {...register('default_timezone')} className="input w-full mt-1">
          <option value="Europe/Amsterdam">Europe/Amsterdam</option>
          <option value="Europe/London">Europe/London</option>
          <option value="Europe/Paris">Europe/Paris</option>
          <option value="Europe/Berlin">Europe/Berlin</option>
          <option value="UTC">UTC</option>
        </select>
      </div>
      
      <div className="flex items-center gap-2">
        <input
          {...register('maintenance_mode')}
          type="checkbox"
          id="maintenance_mode"
          className="h-4 w-4 rounded border-gray-300 text-primary-600"
        />
        <label htmlFor="maintenance_mode" className="text-sm text-gray-700">
          Enable Maintenance Mode
        </label>
      </div>
      
      <div className="flex justify-end">
        <button type="submit" disabled={isPending} className="btn btn-primary">
          {isPending ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}

function EmailSettingsForm({ settings, onSubmit, isPending }: FormProps) {
  const { register, handleSubmit } = useForm({
    defaultValues: {
      smtp_host: settings.smtp_host || '',
      smtp_port: settings.smtp_port || 587,
      smtp_user: settings.smtp_user || '',
      smtp_from_name: settings.smtp_from_name || 'EUSuite',
      smtp_from_email: settings.smtp_from_email || '',
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="card space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">Email Settings</h2>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">SMTP Host</label>
          <input {...register('smtp_host')} className="input w-full mt-1" placeholder="smtp.example.com" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">SMTP Port</label>
          <input {...register('smtp_port', { valueAsNumber: true })} type="number" className="input w-full mt-1" />
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">SMTP Username</label>
        <input {...register('smtp_user')} className="input w-full mt-1" />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">From Name</label>
          <input {...register('smtp_from_name')} className="input w-full mt-1" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">From Email</label>
          <input {...register('smtp_from_email')} type="email" className="input w-full mt-1" />
        </div>
      </div>
      
      <div className="flex justify-end">
        <button type="submit" disabled={isPending} className="btn btn-primary">
          {isPending ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}

function PaymentSettingsForm({ settings, onSubmit, isPending }: FormProps) {
  const { register, handleSubmit } = useForm({
    defaultValues: {
      stripe_publishable_key: settings.stripe_publishable_key || '',
      stripe_webhook_secret: settings.stripe_webhook_secret || '',
      default_currency: settings.default_currency || 'eur',
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="card space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">Payment Settings</h2>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">Stripe Publishable Key</label>
        <input {...register('stripe_publishable_key')} className="input w-full mt-1 font-mono text-sm" placeholder="pk_live_..." />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">Stripe Webhook Secret</label>
        <input {...register('stripe_webhook_secret')} type="password" className="input w-full mt-1 font-mono text-sm" placeholder="whsec_..." />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">Default Currency</label>
        <select {...register('default_currency')} className="input w-full mt-1">
          <option value="eur">EUR (€)</option>
          <option value="usd">USD ($)</option>
          <option value="gbp">GBP (£)</option>
        </select>
      </div>
      
      <div className="flex justify-end">
        <button type="submit" disabled={isPending} className="btn btn-primary">
          {isPending ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}

function InfrastructureSettingsForm({ settings, onSubmit, isPending }: FormProps) {
  const { register, handleSubmit } = useForm({
    defaultValues: {
      k8s_namespace_prefix: settings.k8s_namespace_prefix || 'tenant-',
      default_replicas: settings.default_replicas || 1,
      default_cpu_request: settings.default_cpu_request || '100m',
      default_memory_request: settings.default_memory_request || '128Mi',
      port_range_start: settings.port_range_start || 31000,
      port_range_end: settings.port_range_end || 32767,
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="card space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">Infrastructure Settings</h2>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">K8s Namespace Prefix</label>
        <input {...register('k8s_namespace_prefix')} className="input w-full mt-1 font-mono" />
        <p className="text-xs text-gray-500 mt-1">Prefix for tenant namespaces (e.g., tenant-acme)</p>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">Default Replicas</label>
        <input {...register('default_replicas', { valueAsNumber: true })} type="number" className="input w-full mt-1" />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Default CPU Request</label>
          <input {...register('default_cpu_request')} className="input w-full mt-1 font-mono" placeholder="100m" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Default Memory Request</label>
          <input {...register('default_memory_request')} className="input w-full mt-1 font-mono" placeholder="128Mi" />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">NodePort Range Start</label>
          <input {...register('port_range_start', { valueAsNumber: true })} type="number" className="input w-full mt-1" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">NodePort Range End</label>
          <input {...register('port_range_end', { valueAsNumber: true })} type="number" className="input w-full mt-1" />
        </div>
      </div>
      
      <div className="flex justify-end">
        <button type="submit" disabled={isPending} className="btn btn-primary">
          {isPending ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}

function SecuritySettingsForm({ settings, onSubmit, isPending }: FormProps) {
  const { register, handleSubmit } = useForm({
    defaultValues: {
      session_timeout_minutes: settings.session_timeout_minutes || 60,
      max_login_attempts: settings.max_login_attempts || 5,
      password_min_length: settings.password_min_length || 8,
      require_mfa_for_admins: settings.require_mfa_for_admins || false,
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="card space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">Security Settings</h2>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">Session Timeout (minutes)</label>
        <input {...register('session_timeout_minutes', { valueAsNumber: true })} type="number" className="input w-full mt-1" />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">Max Login Attempts</label>
        <input {...register('max_login_attempts', { valueAsNumber: true })} type="number" className="input w-full mt-1" />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">Minimum Password Length</label>
        <input {...register('password_min_length', { valueAsNumber: true })} type="number" className="input w-full mt-1" />
      </div>
      
      <div className="flex items-center gap-2">
        <input
          {...register('require_mfa_for_admins')}
          type="checkbox"
          id="require_mfa"
          className="h-4 w-4 rounded border-gray-300 text-primary-600"
        />
        <label htmlFor="require_mfa" className="text-sm text-gray-700">
          Require MFA for all administrators
        </label>
      </div>
      
      <div className="flex justify-end">
        <button type="submit" disabled={isPending} className="btn btn-primary">
          {isPending ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}

function BrandingSettingsForm({ settings, onSubmit, isPending }: FormProps) {
  const { register, handleSubmit, watch } = useForm({
    defaultValues: {
      primary_color: settings.primary_color || '#4F46E5',
      secondary_color: settings.secondary_color || '#6366F1',
      logo_url: settings.logo_url || '',
      favicon_url: settings.favicon_url || '',
    },
  })

  const primaryColor = watch('primary_color')
  const secondaryColor = watch('secondary_color')

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="card space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">Branding Settings</h2>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Primary Color</label>
          <div className="flex gap-2 mt-1">
            <input
              {...register('primary_color')}
              type="color"
              className="h-10 w-16 rounded border border-gray-300"
            />
            <input
              {...register('primary_color')}
              type="text"
              className="input flex-1 font-mono"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Secondary Color</label>
          <div className="flex gap-2 mt-1">
            <input
              {...register('secondary_color')}
              type="color"
              className="h-10 w-16 rounded border border-gray-300"
            />
            <input
              {...register('secondary_color')}
              type="text"
              className="input flex-1 font-mono"
            />
          </div>
        </div>
      </div>

      {/* Color preview */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600 mb-2">Preview:</p>
        <div className="flex gap-4">
          <button
            type="button"
            className="px-4 py-2 rounded-lg text-white"
            style={{ backgroundColor: primaryColor }}
          >
            Primary Button
          </button>
          <button
            type="button"
            className="px-4 py-2 rounded-lg text-white"
            style={{ backgroundColor: secondaryColor }}
          >
            Secondary Button
          </button>
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">Logo URL</label>
        <input {...register('logo_url')} type="url" className="input w-full mt-1" placeholder="https://..." />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">Favicon URL</label>
        <input {...register('favicon_url')} type="url" className="input w-full mt-1" placeholder="https://..." />
      </div>
      
      <div className="flex justify-end">
        <button type="submit" disabled={isPending} className="btn btn-primary">
          {isPending ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}
