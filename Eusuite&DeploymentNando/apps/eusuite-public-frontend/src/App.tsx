import { Routes, Route } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import Layout from './components/Layout';
import LoadingSpinner from './components/LoadingSpinner';

// Lazy load pages for better performance
const LandingPage = lazy(() => import('./pages/LandingPage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
const FeaturesPage = lazy(() => import('./pages/FeaturesPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const CompanyRegisterPage = lazy(() => import('./pages/CompanyRegisterPage'));
const ParticulierDashboardPage = lazy(() => import('./pages/ParticulierDashboardPage'));
const UpgradePage = lazy(() => import('./pages/UpgradePage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner fullScreen />}>
      <Routes>
        {/* Public website routes */}
        <Route path="/" element={<Layout />}>
          <Route index element={<LandingPage />} />
          <Route path="pricing" element={<PricingPage />} />
          <Route path="features" element={<FeaturesPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="verify-email" element={<VerifyEmailPage />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
          <Route path="reset-password" element={<ResetPasswordPage />} />
          <Route path="contact" element={<ContactPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="privacy" element={<PrivacyPage />} />
          <Route path="terms" element={<TermsPage />} />
          <Route path="company/register" element={<CompanyRegisterPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
        
        {/* Particulier dashboard (logged in individuals) */}
        <Route path="/dashboard" element={<ParticulierDashboardPage />} />
        <Route path="/upgrade" element={<UpgradePage />} />
        <Route path="/settings" element={<ParticulierDashboardPage />} />
        <Route path="/storage" element={<ParticulierDashboardPage />} />
        <Route path="/billing" element={<ParticulierDashboardPage />} />
        <Route path="/security" element={<ParticulierDashboardPage />} />
      </Routes>
    </Suspense>
  );
}

export default App;
