import { FC, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { authAPI } from '../api/client';
import { useForm } from 'react-hook-form';
import { LockClosedIcon, CheckCircleIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

interface ResetPasswordFormData {
  password: string;
  confirmPassword: string;
}

const ResetPasswordPage: FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordFormData>();

  const password = watch('password');

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      setError('Ongeldige reset link. Vraag een nieuwe aan.');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      await authAPI.resetPassword(token, data.password);
      setIsSubmitted(true);
      toast.success('Wachtwoord succesvol gewijzigd!');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Er ging iets mis. De link is mogelijk verlopen.');
    }
    setIsLoading(false);
  };

  // No token
  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Ongeldige Link</h1>
          <p className="mt-2 text-gray-600">
            Deze reset link is ongeldig of verlopen.
          </p>
          <Link to="/forgot-password" className="mt-8 btn-primary inline-flex">
            Vraag Nieuwe Link Aan
          </Link>
        </div>
      </div>
    );
  }

  // Success state
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircleIcon className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="mt-6 text-2xl font-bold text-gray-900">Wachtwoord Gewijzigd!</h1>
          <p className="mt-2 text-gray-600">
            Je wachtwoord is succesvol gewijzigd. Je wordt doorgestuurd naar de login pagina.
          </p>
          <Link to="/login" className="mt-8 btn-primary inline-flex">
            Nu Inloggen
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto bg-primary-100 rounded-full flex items-center justify-center">
            <LockClosedIcon className="h-8 w-8 text-primary-600" />
          </div>
          <h1 className="mt-6 text-2xl font-bold text-gray-900">Nieuw Wachtwoord</h1>
          <p className="mt-2 text-gray-600">
            Kies een sterk, nieuw wachtwoord voor je account.
          </p>
        </div>

        {error && (
          <div className="mt-6 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-6">
          <div>
            <label htmlFor="password" className="label">
              Nieuw Wachtwoord
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                {...register('password', {
                  required: 'Wachtwoord is verplicht',
                  minLength: {
                    value: 8,
                    message: 'Wachtwoord moet minimaal 8 tekens zijn',
                  },
                  pattern: {
                    value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                    message: 'Wachtwoord moet een hoofdletter, kleine letter en cijfer bevatten',
                  },
                })}
                className={`input pr-10 ${errors.password ? 'input-error' : ''}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                ) : (
                  <EyeIcon className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="label">
              Bevestig Wachtwoord
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                {...register('confirmPassword', {
                  required: 'Bevestig je wachtwoord',
                  validate: (value) =>
                    value === password || 'Wachtwoorden komen niet overeen',
                })}
                className={`input pr-10 ${errors.confirmPassword ? 'input-error' : ''}`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showConfirmPassword ? (
                  <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                ) : (
                  <EyeIcon className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full py-3"
          >
            {isLoading ? <LoadingSpinner size="sm" /> : 'Wachtwoord Wijzigen'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
