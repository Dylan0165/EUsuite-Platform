import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { Dashboard } from './pages/Dashboard';
import { Profile } from './pages/Profile';
import { Settings } from './pages/Settings';
import { Layout } from './components/Layout';
import './App.css';

function AppContent() {
  const { user, loading, logout } = useAuth();

  // Show loading screen while validating SSO session - Rolex green/gold theme
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-emerald-800 via-emerald-700 to-emerald-900">
        <img src="/eusuite-logo.png" alt="EUsuite" className="h-16 mb-4" />
        <div className="text-amber-400 text-3xl font-bold mb-6 tracking-wider">EUSUITE</div>
        <div className="w-12 h-12 border-4 border-amber-400/30 border-t-amber-400 rounded-full animate-spin"></div>
        <p className="mt-4 text-white/90">SSO authenticatie valideren...</p>
      </div>
    );
  }

  // If no user after loading, useAuth has already redirected to login portal
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-emerald-800 via-emerald-700 to-emerald-900">
        <p className="text-white/90">Doorsturen naar login portaal...</p>
      </div>
    );
  }

  // User is authenticated
  return (
    <BrowserRouter>
      <Layout user={user} onLogout={logout}>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

function App() {
  return <AppContent />;
}

export default App;
