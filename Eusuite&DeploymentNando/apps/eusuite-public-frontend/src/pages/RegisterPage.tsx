import { FC, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useForm } from 'react-hook-form';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from '../components/LoadingSpinner';

interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  first_name: string;
  last_name: string;
  phone?: string;
  account_type: 'particulier' | 'company_admin';
  acceptTerms: boolean;
}

const RegisterPage: FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { register: registerUser, isLoading, error } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const selectedPlan = searchParams.get('plan');
  const billingCycle = searchParams.get('billing') || 'monthly';

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    defaultValues: {
      account_type: selectedPlan && selectedPlan !== 'gratis' ? 'company_admin' : 'particulier',
    },
  });

  const password = watch('password');
  const accountType = watch('account_type');

  const onSubmit = async (data: RegisterFormData) => {
    const success = await registerUser({
      email: data.email,
      password: data.password,
      first_name: data.first_name,
      last_name: data.last_name,
      phone: data.phone,
      account_type: data.account_type,
    });

    if (success) {
      if (data.account_type === 'company_admin' && selectedPlan) {
        navigate(`/company/register?plan=${selectedPlan}&billing=${billingCycle}`);
      } else {
        navigate('/verify-email?email=' + encodeURIComponent(data.email));
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left side - Form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div>
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center">
                <span className="text-white font-bold text-lg">EU</span>
              </div>
              <span className="font-bold text-xl text-gray-900">EUSuite</span>
            </Link>
            <h2 className="mt-6 text-3xl font-bold text-gray-900">
              Account Aanmaken
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Heb je al een account?{' '}
              <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-500">
                Log in
              </Link>
            </p>
          </div>

          <div className="mt-8">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Account Type */}
              <div>
                <label className="label">Account Type</label>
                <div className="grid grid-cols-1 gap-3">
                  {/* Particulier Option */}
                  <label
                    className={`flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      accountType === 'particulier'
                        ? 'border-primary-600 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        value="particulier"
                        {...register('account_type')}
                        className="h-4 w-4 text-primary-600"
                      />
                      <div>
                        <span className={`font-semibold ${
                          accountType === 'particulier' ? 'text-primary-600' : 'text-gray-900'
                        }`}>
                          👤 Particulier
                        </span>
                        <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                          Gratis plan beschikbaar
                        </span>
                      </div>
                    </div>
                    <p className="mt-2 ml-7 text-sm text-gray-500">
                      Voor persoonlijk gebruik. Krijg toegang tot alle EUSuite apps met 5GB opslag. 
                      Upgrade later naar Pro voor meer opslag en features.
                    </p>
                  </label>

                  {/* Zakelijk Option */}
                  <label
                    className={`flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      accountType === 'company_admin'
                        ? 'border-primary-600 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        value="company_admin"
                        {...register('account_type')}
                        className="h-4 w-4 text-primary-600"
                      />
                      <div>
                        <span className={`font-semibold ${
                          accountType === 'company_admin' ? 'text-primary-600' : 'text-gray-900'
                        }`}>
                          🏢 Zakelijk
                        </span>
                        <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          Voor teams & bedrijven
                        </span>
                      </div>
                    </div>
                    <p className="mt-2 ml-7 text-sm text-gray-500">
                      Maak een bedrijfsomgeving aan met meerdere gebruikers, eigen branding, 
                      en een geïsoleerde Kubernetes namespace met custom apps.
                    </p>
                  </label>
                </div>
                
                {/* Info box based on selection */}
                {accountType === 'particulier' && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                      <strong>✨ Direct toegang tot:</strong> EUCloud (5GB), EUMail, EUType, EUGroups en Dashboard. 
                      Na registratie kun je direct inloggen op de centrale EUSuite apps.
                    </p>
                  </div>
                )}
                {accountType === 'company_admin' && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>📋 Na registratie:</strong> Je wordt doorgestuurd om je bedrijfsgegevens in te vullen. 
                      Daarna krijg je een eigen omgeving op <code className="bg-blue-100 px-1 rounded">jouw-bedrijf.eusuite.com</code>
                    </p>
                  </div>
                )}
              </div>

              {/* Name fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="first_name" className="label">
                    Voornaam
                  </label>
                  <input
                    id="first_name"
                    type="text"
                    autoComplete="given-name"
                    {...register('first_name', {
                      required: 'Voornaam is verplicht',
                    })}
                    className={`input ${errors.first_name ? 'input-error' : ''}`}
                  />
                  {errors.first_name && (
                    <p className="mt-1 text-sm text-red-600">{errors.first_name.message}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="last_name" className="label">
                    Achternaam
                  </label>
                  <input
                    id="last_name"
                    type="text"
                    autoComplete="family-name"
                    {...register('last_name', {
                      required: 'Achternaam is verplicht',
                    })}
                    className={`input ${errors.last_name ? 'input-error' : ''}`}
                  />
                  {errors.last_name && (
                    <p className="mt-1 text-sm text-red-600">{errors.last_name.message}</p>
                  )}
                </div>
              </div>

              {/* Email */}
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

              {/* Phone (optional) */}
              <div>
                <label htmlFor="phone" className="label">
                  Telefoonnummer <span className="text-gray-400">(optioneel)</span>
                </label>
                <input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  {...register('phone')}
                  className="input"
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="label">
                  Wachtwoord
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
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

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="label">
                  Bevestig Wachtwoord
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
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

              {/* Terms */}
              <div className="flex items-start">
                <input
                  id="acceptTerms"
                  type="checkbox"
                  {...register('acceptTerms', {
                    required: 'Je moet akkoord gaan met de voorwaarden',
                  })}
                  className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 mt-1"
                />
                <label htmlFor="acceptTerms" className="ml-2 text-sm text-gray-600">
                  Ik ga akkoord met de{' '}
                  <Link to="/terms" className="text-primary-600 hover:underline">
                    algemene voorwaarden
                  </Link>{' '}
                  en het{' '}
                  <Link to="/privacy" className="text-primary-600 hover:underline">
                    privacybeleid
                  </Link>
                </label>
              </div>
              {errors.acceptTerms && (
                <p className="text-sm text-red-600">{errors.acceptTerms.message}</p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full py-3"
              >
                {isLoading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  'Account Aanmaken'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Right side - Image/Info */}
      <div className="hidden lg:block relative w-0 flex-1">
        <div className="absolute inset-0 gradient-hero flex items-center justify-center p-12">
          <div className="max-w-md text-white">
            <h3 className="text-3xl font-bold">
              Word onderdeel van de EUSuite community
            </h3>
            <ul className="mt-8 space-y-4">
              <li className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                  <span className="text-sm">✓</span>
                </div>
                <span>14 dagen gratis uitproberen</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                  <span className="text-sm">✓</span>
                </div>
                <span>Geen creditcard nodig</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                  <span className="text-sm">✓</span>
                </div>
                <span>Annuleer wanneer je wilt</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                  <span className="text-sm">✓</span>
                </div>
                <span>100% EU gehost & GDPR compliant</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
