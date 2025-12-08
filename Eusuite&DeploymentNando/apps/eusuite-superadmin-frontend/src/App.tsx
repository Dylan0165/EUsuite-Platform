import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import AdminLayout from '@/components/layout/AdminLayout'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import TenantsPage from '@/pages/TenantsPage'
import TenantDetailPage from '@/pages/TenantDetailPage'
import PlansPage from '@/pages/PlansPage'
import DeploymentsPage from '@/pages/DeploymentsPage'
import KubernetesPage from '@/pages/KubernetesPage'
import InvoicesPage from '@/pages/InvoicesPage'
import TicketsPage from '@/pages/TicketsPage'
import TicketDetailPage from '@/pages/TicketDetailPage'
import AdminsPage from '@/pages/AdminsPage'
import AuditLogsPage from '@/pages/AuditLogsPage'
import SettingsPage from '@/pages/SettingsPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  return <>{children}</>
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="tenants" element={<TenantsPage />} />
        <Route path="tenants/:id" element={<TenantDetailPage />} />
        <Route path="plans" element={<PlansPage />} />
        <Route path="deployments" element={<DeploymentsPage />} />
        <Route path="kubernetes" element={<KubernetesPage />} />
        <Route path="invoices" element={<InvoicesPage />} />
        <Route path="tickets" element={<TicketsPage />} />
        <Route path="tickets/:id" element={<TicketDetailPage />} />
        <Route path="admins" element={<AdminsPage />} />
        <Route path="audit" element={<AuditLogsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
