import { FC, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import {
  CheckIcon,
  ArrowLeftIcon,
  SparklesIcon,
  CloudIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../components/LoadingSpinner';

const PARTICULIER_PLANS = [
  {
    id: 'gratis',
    name: 'Gratis',
    price: 0,
    yearlyPrice: 0,
    storage: 5,
    description: 'Perfect om te beginnen',
    features: [
      '5 GB cloudopslag',
      'Toegang tot alle basis apps',
      'EU gehost & GDPR compliant',
      '1 gebruiker',
      'Community support',
    ],
    notIncluded: [
      'Offline sync',
      'Priority support',
      'Extra opslag',
    ],
    current: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 4.99,
    yearlyPrice: 49.99,
    storage: 100,
    description: 'Voor de power user',
    features: [
      '100 GB cloudopslag',
      'Alle apps + premium features',
      'Offline synchronisatie',
      'Priority email support',
      'Versiebeheer (30 dagen)',
      'Geavanceerde zoekfunctie',
      'Geen advertenties',
    ],
    notIncluded: [],
    recommended: true,
    popular: true,
  },
  {
    id: 'familie',
    name: 'Familie',
    price: 9.99,
    yearlyPrice: 99.99,
    storage: 500,
    description: 'Deel met je gezin',
    icon: UsersIcon,
    features: [
      '500 GB gedeelde opslag',
      'Tot 6 gezinsleden',
      'Alle Pro features',
      'Gedeelde folders',
      'Gezinsbeheer dashboard',
      'Family calendar sync',
      '24/7 phone support',
    ],
    notIncluded: [],
  },
];

const UpgradePage: FC = () => {
  const { user, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isAuthenticated) {
    navigate('/login');
    return null;
  }

  const handleUpgrade = async (planId: string) => {
    setIsLoading(true);
    setSelectedPlan(planId);

    try {
      // In production: redirect to Stripe checkout
      // const response = await api.post('/subscriptions/checkout', { plan_id: planId, billing_cycle: billingCycle });
      // window.location.href = response.data.checkout_url;
      
      // Demo: simulate upgrade
      await new Promise(resolve => setTimeout(resolve, 1500));
      navigate('/dashboard?upgraded=true');
    } catch (error) {
      console.error('Upgrade failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const savings = billingCycle === 'yearly' ? '17%' : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 gap-4">
            <Link to="/dashboard" className="text-gray-500 hover:text-gray-700">
              <ArrowLeftIcon className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center">
                <span className="text-white font-bold text-lg">EU</span>
              </div>
              <span className="font-bold text-xl text-gray-900">EUSuite</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-700 rounded-full text-sm font-medium mb-4">
            <SparklesIcon className="h-4 w-4" />
            Upgrade je account
          </div>
          <h1 className="text-4xl font-bold text-gray-900">
            Kies het plan dat bij jou past
          </h1>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            Meer opslag, meer features, meer mogelijkheden. Upgrade nu en krijg direct toegang.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-lg p-1 border border-gray-200 inline-flex">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                billingCycle === 'monthly'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Maandelijks
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                billingCycle === 'yearly'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Jaarlijks
              {savings && (
                <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                  -{savings}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {PARTICULIER_PLANS.map((plan) => {
            const price = billingCycle === 'yearly' ? plan.yearlyPrice : plan.price;
            const isCurrentPlan = plan.current;
            
            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-2xl border-2 p-8 ${
                  plan.recommended
                    ? 'border-primary-500 shadow-lg'
                    : 'border-gray-200'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-primary-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                      Meest gekozen
                    </span>
                  </div>
                )}

                <div className="text-center">
                  <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{plan.description}</p>
                  
                  <div className="mt-6">
                    <span className="text-4xl font-bold text-gray-900">€{price}</span>
                    <span className="text-gray-500">
                      /{billingCycle === 'yearly' ? 'jaar' : 'maand'}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center justify-center gap-2 text-sm">
                    <CloudIcon className="h-4 w-4 text-blue-500" />
                    <span className="font-medium text-gray-900">{plan.storage} GB</span>
                    <span className="text-gray-500">opslag</span>
                  </div>
                </div>

                <ul className="mt-8 space-y-3">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckIcon className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <span className="text-sm text-gray-600">{feature}</span>
                    </li>
                  ))}
                  {plan.notIncluded.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 opacity-50">
                      <span className="h-5 w-5 flex-shrink-0 text-center text-gray-300">—</span>
                      <span className="text-sm text-gray-400 line-through">{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-8">
                  {isCurrentPlan ? (
                    <button
                      disabled
                      className="w-full py-3 px-4 bg-gray-100 text-gray-500 rounded-lg font-medium cursor-not-allowed"
                    >
                      Huidig plan
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpgrade(plan.id)}
                      disabled={isLoading && selectedPlan === plan.id}
                      className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                        plan.recommended
                          ? 'bg-primary-600 text-white hover:bg-primary-700'
                          : 'bg-gray-900 text-white hover:bg-gray-800'
                      }`}
                    >
                      {isLoading && selectedPlan === plan.id ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        `Upgrade naar ${plan.name}`
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* FAQ Section */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
            Veelgestelde vragen
          </h2>
          <div className="space-y-4">
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="font-semibold text-gray-900">Kan ik later upgraden of downgraden?</h3>
              <p className="mt-2 text-gray-600 text-sm">
                Ja, je kunt op elk moment je plan wijzigen. Bij een upgrade krijg je direct toegang tot de nieuwe features. Bij een downgrade blijft je huidige plan actief tot het einde van de betaalperiode.
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="font-semibold text-gray-900">Wat gebeurt er met mijn bestanden als ik downgrade?</h3>
              <p className="mt-2 text-gray-600 text-sm">
                Je bestanden blijven bewaard. Als je meer opslag gebruikt dan je nieuwe limiet, kun je geen nieuwe bestanden uploaden totdat je ruimte vrijmaakt of weer upgrade.
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="font-semibold text-gray-900">Hoe werkt het Familie plan?</h3>
              <p className="mt-2 text-gray-600 text-sm">
                Met het Familie plan kun je tot 6 gezinsleden uitnodigen. Iedereen krijgt een eigen account met toegang tot de 500 GB gedeelde opslag. Je kunt ook privé folders aanmaken.
              </p>
            </div>
          </div>
        </div>

        {/* Trust badges */}
        <div className="mt-16 flex flex-wrap justify-center items-center gap-8 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <span className="text-lg">🔒</span>
            <span>SSL Beveiligd</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg">🇪🇺</span>
            <span>100% EU Gehost</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg">✓</span>
            <span>GDPR Compliant</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg">💳</span>
            <span>Veilig betalen via Stripe</span>
          </div>
        </div>
      </main>
    </div>
  );
};

export default UpgradePage;
