import { FC, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authAPI } from '../api/client';
import { EnvelopeIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from '../components/LoadingSpinner';

const VerifyEmailPage: FC = () => {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email');
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'pending' | 'verifying' | 'success' | 'error'>('pending');
  const [message, setMessage] = useState('');
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    // If token is present, verify it
    if (token) {
      setStatus('verifying');
      authAPI.verifyEmail(token)
        .then(() => {
          setStatus('success');
          setMessage('Je email is geverifieerd! Je kunt nu inloggen.');
        })
        .catch((err) => {
          setStatus('error');
          setMessage(err.response?.data?.detail || 'Verificatie mislukt. De link is mogelijk verlopen.');
        });
    }
  }, [token]);

  const handleResendVerification = async () => {
    if (!email) return;
    
    setIsResending(true);
    try {
      await authAPI.resendVerification(email);
      setMessage('Een nieuwe verificatie email is verzonden!');
    } catch (err: any) {
      setMessage(err.response?.data?.detail || 'Kon geen nieuwe email versturen.');
    }
    setIsResending(false);
  };

  // Verifying state
  if (status === 'verifying') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" text="Email verifiëren..." />
        </div>
      </div>
    );
  }

  // Success state
  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircleIcon className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="mt-6 text-2xl font-bold text-gray-900">Email Geverifieerd!</h1>
          <p className="mt-2 text-gray-600">{message}</p>
          <Link to="/login" className="mt-8 btn-primary inline-flex">
            Naar Inloggen
          </Link>
        </div>
      </div>
    );
  }

  // Error state
  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
            <XCircleIcon className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="mt-6 text-2xl font-bold text-gray-900">Verificatie Mislukt</h1>
          <p className="mt-2 text-gray-600">{message}</p>
          <div className="mt-8 space-y-3">
            <Link to="/login" className="btn-primary w-full">
              Naar Inloggen
            </Link>
            <Link to="/register" className="btn-secondary w-full">
              Opnieuw Registreren
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Pending state (waiting for email verification)
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 mx-auto bg-primary-100 rounded-full flex items-center justify-center">
          <EnvelopeIcon className="h-8 w-8 text-primary-600" />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-gray-900">Verifieer je Email</h1>
        <p className="mt-2 text-gray-600">
          We hebben een verificatie email gestuurd naar:
        </p>
        {email && (
          <p className="mt-2 font-semibold text-gray-900">{email}</p>
        )}
        <p className="mt-4 text-sm text-gray-500">
          Klik op de link in de email om je account te activeren. 
          Controleer ook je spam folder.
        </p>

        {message && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-600">{message}</p>
          </div>
        )}

        <div className="mt-8 space-y-3">
          <button
            onClick={handleResendVerification}
            disabled={isResending || !email}
            className="btn-secondary w-full"
          >
            {isResending ? <LoadingSpinner size="sm" /> : 'Verstuur Opnieuw'}
          </button>
          <Link to="/login" className="block text-sm text-primary-600 hover:underline">
            Terug naar inloggen
          </Link>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
