import { FC, useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { usePlansStore, formatPrice, Plan } from '../stores/plansStore';
import { companiesAPI } from '../api/client';
import { useForm } from 'react-hook-form';
import { BuildingOfficeIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

interface CompanyFormData {
  name: string;
  kvk_number: string;
  btw_number: string;
  address: string;
  city: string;
  postal_code: string;
  country: string;
  phone: string;
  website: string;
}

const CompanyRegisterPage: FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const { plans, billingCycle, fetchPlans, setBillingCycle } = usePlansStore();

  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const planSlug = searchParams.get('plan');
  const billing = searchParams.get('billing') as 'monthly' | 'yearly' | null;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CompanyFormData>({
    defaultValues: {
      country: 'Nederland',
    },
  });

  useEffect(() => {
    // Redirect if not logged in or not company_admin
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (user?.account_type !== 'company_admin') {
      navigate('/');
      return;
    }

    // Fetch plans if not loaded
    if (plans.length === 0) {
      fetchPlans();
    }

    // Set billing cycle from URL
    if (billing) {
      setBillingCycle(billing);
    }
  }, [isAuthenticated, user, navigate, plans.length, fetchPlans, billing, setBillingCycle]);

  useEffect(() => {
    // Find selected plan
    if (planSlug && plans.length > 0) {
      const plan = plans.find((p) => p.slug === planSlug);
      if (plan) {
        setSelectedPlan(plan);
      }
    }
  }, [planSlug, plans]);

  const onSubmit = async (data: CompanyFormData) => {
    if (!selectedPlan) {
      toast.error('Selecteer een plan');
      return;
    }

    setIsLoading(true);
    try {
      await companiesAPI.register({
        ...data,
        plan_id: selectedPlan.id,
        billing_cycle: billingCycle,
      });
      setIsSubmitted(true);
      toast.success('Bedrijf succesvol geregistreerd!');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Registratie mislukt');
    }
    setIsLoading(false);
  };

  // Success state
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircleIcon className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="mt-6 text-2xl font-bold text-gray-900">Bedrijf Geregistreerd!</h1>
          <p className="mt-2 text-gray-600">
            Uw bedrijfsomgeving wordt nu aangemaakt. Dit kan enkele minuten duren.
          </p>
          <p className="mt-4 text-sm text-gray-500">
            U ontvangt een email zodra uw omgeving gereed is.
          </p>
          <a
            href="https://company.eusuite.eu"
            className="mt-8 btn-primary inline-flex"
          >
            Naar Company Portal
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center">
                <span className="text-white font-bold text-lg">EU</span>
              </div>
              <span className="font-bold text-xl text-gray-900">EUSuite</span>
            </Link>
            <h1 className="mt-6 text-3xl font-bold text-gray-900">Registreer uw Bedrijf</h1>
            <p className="mt-2 text-gray-600">
              Vul de bedrijfsgegevens in om uw EUSuite omgeving aan te maken.
            </p>
          </div>

          {/* Plan Selection */}
          {!selectedPlan && plans.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Selecteer een Plan</h2>
              <div className="grid md:grid-cols-3 gap-4">
                {plans
                  .filter((p) => p.slug !== 'gratis')
                  .map((plan) => (
                    <button
                      key={plan.id}
                      onClick={() => setSelectedPlan(plan)}
                      className="p-4 rounded-xl border-2 text-left transition-colors border-gray-200 hover:border-primary-600 hover:bg-primary-50"
                    >
                      <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                      <p className="mt-1 text-2xl font-bold text-gray-900">
                        {formatPrice(
                          billingCycle === 'yearly'
                            ? plan.price_yearly_cents / 12
                            : plan.price_monthly_cents
                        )}
                        <span className="text-sm font-normal text-gray-500">/maand</span>
                      </p>
                      <p className="mt-2 text-sm text-gray-500">{plan.max_users} gebruikers</p>
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* Selected Plan Summary */}
          {selectedPlan && (
            <div className="bg-primary-50 rounded-xl p-4 mb-8 flex items-center justify-between">
              <div>
                <p className="text-sm text-primary-600">Geselecteerd plan</p>
                <p className="font-semibold text-gray-900">
                  {selectedPlan.name} - {formatPrice(
                    billingCycle === 'yearly'
                      ? selectedPlan.price_yearly_cents / 12
                      : selectedPlan.price_monthly_cents
                  )}/maand
                </p>
              </div>
              <button
                onClick={() => setSelectedPlan(null)}
                className="text-sm text-primary-600 hover:underline"
              >
                Wijzigen
              </button>
            </div>
          )}

          {/* Form */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
                <BuildingOfficeIcon className="h-6 w-6 text-primary-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Bedrijfsgegevens</h2>
                <p className="text-sm text-gray-500">Deze gegevens worden gebruikt voor facturatie.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Company Name */}
              <div>
                <label htmlFor="name" className="label">
                  Bedrijfsnaam *
                </label>
                <input
                  id="name"
                  type="text"
                  {...register('name', { required: 'Bedrijfsnaam is verplicht' })}
                  className={`input ${errors.name ? 'input-error' : ''}`}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              {/* KvK & BTW */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="kvk_number" className="label">
                    KvK-nummer
                  </label>
                  <input
                    id="kvk_number"
                    type="text"
                    {...register('kvk_number')}
                    className="input"
                  />
                </div>
                <div>
                  <label htmlFor="btw_number" className="label">
                    BTW-nummer
                  </label>
                  <input
                    id="btw_number"
                    type="text"
                    placeholder="NL123456789B01"
                    {...register('btw_number')}
                    className="input"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label htmlFor="address" className="label">
                  Adres
                </label>
                <input
                  id="address"
                  type="text"
                  {...register('address')}
                  className="input"
                />
              </div>

              {/* City & Postal */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="city" className="label">
                    Plaats
                  </label>
                  <input
                    id="city"
                    type="text"
                    {...register('city')}
                    className="input"
                  />
                </div>
                <div>
                  <label htmlFor="postal_code" className="label">
                    Postcode
                  </label>
                  <input
                    id="postal_code"
                    type="text"
                    {...register('postal_code')}
                    className="input"
                  />
                </div>
              </div>

              {/* Country */}
              <div>
                <label htmlFor="country" className="label">
                  Land
                </label>
                <select
                  id="country"
                  {...register('country')}
                  className="input"
                >
                  <option value="Nederland">Nederland</option>
                  <option value="België">België</option>
                  <option value="Duitsland">Duitsland</option>
                  <option value="Frankrijk">Frankrijk</option>
                  <option value="Anders">Anders</option>
                </select>
              </div>

              {/* Phone & Website */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="phone" className="label">
                    Telefoonnummer
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    {...register('phone')}
                    className="input"
                  />
                </div>
                <div>
                  <label htmlFor="website" className="label">
                    Website
                  </label>
                  <input
                    id="website"
                    type="url"
                    placeholder="https://example.com"
                    {...register('website')}
                    className="input"
                  />
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading || !selectedPlan}
                className="btn-primary w-full py-3 mt-6"
              >
                {isLoading ? <LoadingSpinner size="sm" /> : 'Bedrijf Registreren'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyRegisterPage;
