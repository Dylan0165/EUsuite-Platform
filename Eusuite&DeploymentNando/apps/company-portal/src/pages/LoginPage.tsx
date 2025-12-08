import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Cloud, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api/client';

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuthStore();
  
  const [companySlug, setCompanySlug] = useState(searchParams.get('company') || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await authApi.login({
        email,
        password,
        company_slug: companySlug,
      });

      login(response.access_token, response.user, response.company);
      navigate('/');
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { detail?: string } } };
        setError(axiosError.response?.data?.detail || 'Inloggen mislukt');
      } else {
        setError('Inloggen mislukt');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Cloud className="w-10 h-10 text-primary-600" />
            <span className="text-2xl font-bold text-gray-900">Company Portal</span>
          </div>
          <p className="text-gray-600">Log in op je bedrijfsaccount</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bedrijf
              </label>
              <div className="flex">
                <input
                  type="text"
                  value={companySlug}
                  onChange={(e) => setCompanySlug(e.target.value.toLowerCase())}
                  className="flex-1 input rounded-r-none"
                  placeholder="jouw-bedrijf"
                  required
                />
                <span className="px-4 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg text-gray-500 text-sm">
                  .eusuite.eu
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                E-mailadres
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="naam@bedrijf.nl"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Wachtwoord
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Inloggen...
                </>
              ) : (
                'Inloggen'
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <a href="#" className="text-sm text-primary-600 hover:underline">
              Wachtwoord vergeten?
            </a>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-sm text-gray-500">
          Nog geen account?{' '}
          <a href="https://eusuite.eu/register" className="text-primary-600 hover:underline">
            Registreer je bedrijf
          </a>
        </p>
      </div>
    </div>
  );
}
