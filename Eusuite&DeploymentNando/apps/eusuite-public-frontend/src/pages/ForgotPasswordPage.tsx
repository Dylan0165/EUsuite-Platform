import { FC, useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../api/client';
import { useForm } from 'react-hook-form';
import { EnvelopeIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from '../components/LoadingSpinner';

interface ForgotPasswordFormData {
  email: string;
}

const ForgotPasswordPage: FC = () => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<ForgotPasswordFormData>();

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    setError('');
    try {
      await authAPI.forgotPassword(data.email);
      setIsSubmitted(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Er ging iets mis. Probeer het opnieuw.');
    }
    setIsLoading(false);
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircleIcon className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="mt-6 text-2xl font-bold text-gray-900">Email Verzonden</h1>
          <p className="mt-2 text-gray-600">
            Als er een account bestaat voor <strong>{getValues('email')}</strong>, 
            ontvang je een email met instructies om je wachtwoord te resetten.
          </p>
          <p className="mt-4 text-sm text-gray-500">
            Controleer ook je spam folder.
          </p>
          <Link to="/login" className="mt-8 btn-primary inline-flex">
            Terug naar Inloggen
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
            <EnvelopeIcon className="h-8 w-8 text-primary-600" />
          </div>
          <h1 className="mt-6 text-2xl font-bold text-gray-900">Wachtwoord Vergeten?</h1>
          <p className="mt-2 text-gray-600">
            Geen probleem! Vul je emailadres in en we sturen je een link om je wachtwoord te resetten.
          </p>
        </div>

        {error && (
          <div className="mt-6 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-6">
          <div>
            <label htmlFor="email" className="label">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              {...register('email', {
                required: 'Email is verplicht',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Ongeldig emailadres',
                },
              })}
              className={`input ${errors.email ? 'input-error' : ''}`}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full py-3"
          >
            {isLoading ? <LoadingSpinner size="sm" /> : 'Verstuur Reset Link'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/login" className="text-sm text-primary-600 hover:underline">
            Terug naar inloggen
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
