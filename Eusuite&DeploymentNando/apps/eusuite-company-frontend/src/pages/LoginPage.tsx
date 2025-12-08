import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/stores/authStore'
import { useBrandingStore } from '@/stores/brandingStore'
import LoadingSpinner from '@/components/common/LoadingSpinner'

interface LoginFormData {
  email: string
  password: string
}

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuthStore()
  const { branding } = useBrandingStore()
  const navigate = useNavigate()
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>()

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    
    try {
      await login(data.email, data.password)
      toast.success('Welcome back!')
      navigate('/dashboard')
    } catch (error: any) {
      toast.error(error.message || 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            {branding?.logo_url ? (
              <img
                src={branding.logo_url}
                alt={branding.company_name_display || 'Company'}
                className="h-12 mx-auto mb-4"
              />
            ) : (
              <div
                className="h-14 w-14 rounded-xl mx-auto mb-4 flex items-center justify-center text-white font-bold text-2xl"
                style={{ backgroundColor: 'var(--brand-primary)' }}
              >
                EU
              </div>
            )}
            <h1 className="text-2xl font-bold text-gray-900">
              {branding?.company_name_display || 'Company Admin'}
            </h1>
            <p className="text-gray-500 mt-1">
              Sign in to manage your organization
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className="form-input"
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address',
                  },
                })}
              />
              {errors.email && (
                <p className="form-error">{errors.email.message}</p>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                className="form-input"
                {...register('password', {
                  required: 'Password is required',
                })}
              />
              {errors.password && (
                <p className="form-error">{errors.password.message}</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm text-gray-600">Remember me</span>
              </label>

              <a
                href="#"
                className="text-sm font-medium hover:underline"
                style={{ color: 'var(--brand-primary)' }}
              >
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary w-full h-11"
            >
              {isLoading ? <LoadingSpinner size="sm" /> : 'Sign in'}
            </button>
          </form>

          {/* Footer */}
          {branding?.show_powered_by !== false && (
            <p className="text-center text-sm text-gray-400 mt-8">
              Powered by <span className="font-medium">EUSuite</span>
            </p>
          )}
        </div>
      </div>

      {/* Right side - Image/Gradient */}
      <div
        className="hidden lg:block lg:w-1/2 relative"
        style={{
          background: `linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-secondary) 100%)`,
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="text-center text-white">
            <h2 className="text-4xl font-bold mb-4">
              Welcome to {branding?.company_name_display || 'Your Organization'}
            </h2>
            <p className="text-xl opacity-90">
              {branding?.tagline || 'Manage your team, apps, and resources'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
