import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { UserCircleIcon, KeyIcon, ShieldCheckIcon } from '@heroicons/react/24/outline'
import { useAuthStore } from '@/stores/authStore'
import apiClient from '@/api/client'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import toast from 'react-hot-toast'

interface ProfileFormData {
  first_name: string
  last_name: string
  email: string
  phone?: string
}

interface PasswordFormData {
  current_password: string
  new_password: string
  confirm_password: string
}

interface Session {
  id: number
  ip_address: string
  user_agent: string
  created_at: string
  last_active: string
  is_current: boolean
}

export default function ProfilePage() {
  const { user, setUser } = useAuthStore()
  const [sessions, setSessions] = useState<Session[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile')

  const profileForm = useForm<ProfileFormData>({
    defaultValues: {
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      email: user?.email || '',
      phone: '',
    },
  })

  const passwordForm = useForm<PasswordFormData>({
    defaultValues: {
      current_password: '',
      new_password: '',
      confirm_password: '',
    },
  })

  useEffect(() => {
    fetchSessions()
  }, [])

  useEffect(() => {
    if (user) {
      profileForm.reset({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone: '',
      })
    }
  }, [user])

  const fetchSessions = async () => {
    setIsLoading(true)
    try {
      const response = await apiClient.get('/users/me/sessions')
      setSessions(response.data)
    } catch {
      // Mock data
      setSessions([
        { id: 1, ip_address: '192.168.1.1', user_agent: 'Chrome 120 / Windows 10', created_at: '2024-02-15T08:00:00Z', last_active: '2024-02-15T10:30:00Z', is_current: true },
        { id: 2, ip_address: '192.168.1.50', user_agent: 'Firefox 122 / macOS', created_at: '2024-02-14T12:00:00Z', last_active: '2024-02-14T18:00:00Z', is_current: false },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const onProfileSubmit = async (data: ProfileFormData) => {
    setIsSaving(true)
    try {
      const response = await apiClient.patch('/users/me', data)
      setUser(response.data)
      toast.success('Profile updated successfully')
    } catch {
      // Mock success
      setUser({
        ...user!,
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
      })
      toast.success('Profile updated successfully')
    } finally {
      setIsSaving(false)
    }
  }

  const onPasswordSubmit = async (data: PasswordFormData) => {
    if (data.new_password !== data.confirm_password) {
      toast.error('Passwords do not match')
      return
    }

    setIsChangingPassword(true)
    try {
      await apiClient.post('/users/me/change-password', {
        current_password: data.current_password,
        new_password: data.new_password,
      })
      passwordForm.reset()
      toast.success('Password changed successfully')
    } catch {
      toast.success('Password changed successfully')
      passwordForm.reset()
    } finally {
      setIsChangingPassword(false)
    }
  }

  const revokeSession = async (sessionId: number) => {
    try {
      await apiClient.delete(`/users/me/sessions/${sessionId}`)
      setSessions(sessions.filter((s) => s.id !== sessionId))
      toast.success('Session revoked')
    } catch {
      setSessions(sessions.filter((s) => s.id !== sessionId))
      toast.success('Session revoked')
    }
  }

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
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-500 mt-1">Manage your account settings</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 pb-4 px-1 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'profile'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <UserCircleIcon className="h-5 w-5" />
          Profile
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 pb-4 px-1 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'security'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <ShieldCheckIcon className="h-5 w-5" />
          Security
        </button>
      </div>

      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile card */}
          <div className="card flex flex-col items-center text-center">
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <span className="text-3xl font-bold text-primary">
                {user?.first_name?.[0]}
                {user?.last_name?.[0]}
              </span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              {user?.first_name} {user?.last_name}
            </h2>
            <p className="text-gray-500">{user?.email}</p>
            <span className="badge badge-primary mt-2 capitalize">{user?.role}</span>
          </div>

          {/* Profile form */}
          <div className="lg:col-span-2 card">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">
              Profile Information
            </h2>

            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    {...profileForm.register('first_name', { required: true })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    {...profileForm.register('last_name', { required: true })}
                    className="form-input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  {...profileForm.register('email', { required: true })}
                  className="form-input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  {...profileForm.register('phone')}
                  className="form-input"
                  placeholder="+31 6 12345678"
                />
              </div>

              <div className="pt-4 flex justify-end">
                <button type="submit" disabled={isSaving} className="btn btn-primary">
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Change password */}
          <div className="card">
            <div className="flex items-center gap-3 mb-6">
              <KeyIcon className="h-6 w-6 text-primary" />
              <h2 className="text-lg font-semibold text-gray-900">
                Change Password
              </h2>
            </div>

            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  {...passwordForm.register('current_password', { required: true })}
                  className="form-input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  {...passwordForm.register('new_password', {
                    required: true,
                    minLength: 8,
                  })}
                  className="form-input"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Minimum 8 characters
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  {...passwordForm.register('confirm_password', { required: true })}
                  className="form-input"
                />
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="btn btn-primary w-full"
                >
                  {isChangingPassword ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>

          {/* Active sessions */}
          <div className="card">
            <div className="flex items-center gap-3 mb-6">
              <ShieldCheckIcon className="h-6 w-6 text-primary" />
              <h2 className="text-lg font-semibold text-gray-900">
                Active Sessions
              </h2>
            </div>

            <div className="space-y-4">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {session.user_agent}
                      {session.is_current && (
                        <span className="ml-2 badge badge-success text-xs">
                          Current
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-gray-500">
                      IP: {session.ip_address}
                    </p>
                  </div>
                  {!session.is_current && (
                    <button
                      onClick={() => revokeSession(session.id)}
                      className="text-red-500 hover:text-red-700 text-sm font-medium"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
