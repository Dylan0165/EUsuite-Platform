import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useBrandingStore } from '@/stores/brandingStore'
import DashboardLayout from '@/components/layout/DashboardLayout'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import UsersPage from '@/pages/UsersPage'
import UserDetailPage from '@/pages/UserDetailPage'
import DepartmentsPage from '@/pages/DepartmentsPage'
import DeploymentsPage from '@/pages/DeploymentsPage'
import KubernetesPage from '@/pages/KubernetesPage'
import BrandingPage from '@/pages/BrandingPage'
import StoragePage from '@/pages/StoragePage'
import SettingsPage from '@/pages/SettingsPage'
import AuditLogsPage from '@/pages/AuditLogsPage'
import NotFoundPage from '@/pages/NotFoundPage'
import LoadingSpinner from '@/components/common/LoadingSpinner'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function App() {
  const { fetchBranding } = useBrandingStore()

  useEffect(() => {
    fetchBranding()
  }, [fetchBranding])

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="users/:userId" element={<UserDetailPage />} />
        <Route path="departments" element={<DepartmentsPage />} />
        <Route path="deployments" element={<DeploymentsPage />} />
        <Route path="kubernetes" element={<KubernetesPage />} />
        <Route path="branding" element={<BrandingPage />} />
        <Route path="storage" element={<StoragePage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="audit" element={<AuditLogsPage />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App
