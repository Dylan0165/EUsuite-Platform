import { FC, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePlansStore, formatPrice, getYearlySavings, Plan } from '../stores/plansStore';
import { CheckIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from '../components/LoadingSpinner';

const PricingPage: FC = () => {
  const { plans, billingCycle, isLoading, fetchPlans, setBillingCycle } = usePlansStore();
  const [hoveredPlan, setHoveredPlan] = useState<string | null>(null);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const getPrice = (plan: Plan) => {
    if (billingCycle === 'yearly') {
      return plan.price_yearly_cents / 12; // Show monthly equivalent
    }
    return plan.price_monthly_cents;
  };

  const getTotalYearlyPrice = (plan: Plan) => {
    return plan.price_yearly_cents;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Prijzen laden..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <section className="bg-white py-16 border-b border-gray-100">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900">
            Transparante Prijzen
          </h1>
          <p className="mt-4 text-xl text-gray-600 max-w-2xl mx-auto">
            Kies het plan dat bij uw organisatie past. Schaal eenvoudig op wanneer u groeit.
          </p>

          {/* Billing toggle */}
          <div className="mt-10 flex items-center justify-center gap-4">
            <span
              className={`text-sm font-medium ${
                billingCycle === 'monthly' ? 'text-gray-900' : 'text-gray-500'
              }`}
            >
              Maandelijks
            </span>
            <button
              onClick={() =>
                setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')
              }
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2 ${
                billingCycle === 'yearly' ? 'bg-primary-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  billingCycle === 'yearly' ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <span
              className={`text-sm font-medium ${
                billingCycle === 'yearly' ? 'text-gray-900' : 'text-gray-500'
              }`}
            >
              Jaarlijks
            </span>
            {billingCycle === 'yearly' && (
              <span className="ml-2 inline-flex items-center rounded-full bg-green-100 px-3 py-0.5 text-sm font-medium text-green-800">
                Bespaar tot 20%
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative bg-white rounded-2xl border-2 transition-all duration-300 ${
                  plan.is_popular
                    ? 'border-primary-600 shadow-xl scale-105'
                    : hoveredPlan === plan.slug
                    ? 'border-primary-300 shadow-lg'
                    : 'border-gray-200 shadow-sm'
                }`}
                onMouseEnter={() => setHoveredPlan(plan.slug)}
                onMouseLeave={() => setHoveredPlan(null)}
              >
                {/* Popular badge */}
                {plan.is_popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="inline-flex items-center rounded-full bg-primary-600 px-4 py-1 text-sm font-semibold text-white">
                      Meest Populair
                    </span>
                  </div>
                )}

                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                  <p className="mt-2 text-sm text-gray-500 min-h-[40px]">
                    {plan.description}
                  </p>

                  <div className="mt-6">
                    <span className="text-4xl font-bold text-gray-900">
                      {formatPrice(getPrice(plan))}
                    </span>
                    <span className="text-gray-500">/maand</span>
                    {billingCycle === 'yearly' && (
                      <div className="mt-1">
                        <span className="text-sm text-gray-500">
                          {formatPrice(getTotalYearlyPrice(plan))} per jaar
                        </span>
                        <span className="ml-2 text-sm font-medium text-green-600">
                          Bespaar {getYearlySavings(plan)}%
                        </span>
                      </div>
                    )}
                  </div>

                  <Link
                    to={`/register?plan=${plan.slug}&billing=${billingCycle}`}
                    className={`mt-6 block w-full text-center py-3 px-4 rounded-lg font-semibold transition-colors ${
                      plan.is_popular
                        ? 'bg-primary-600 text-white hover:bg-primary-700'
                        : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                    }`}
                  >
                    {plan.price_monthly_cents === 0 ? 'Start Gratis' : 'Kies Plan'}
                  </Link>

                  <div className="mt-6 pt-6 border-t border-gray-100">
                    <h4 className="text-sm font-semibold text-gray-900 mb-4">
                      Inbegrepen:
                    </h4>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-2">
                        <CheckIcon className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-600">
                          {plan.max_users === -1 ? 'Onbeperkt' : plan.max_users} gebruiker(s)
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckIcon className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-600">
                          {plan.max_storage_gb === -1 ? 'Onbeperkte' : `${plan.max_storage_gb} GB`} opslag
                        </span>
                      </li>
                      {plan.features?.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckIcon className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-gray-600">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Veelgestelde Vragen
          </h2>
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900">Kan ik upgraden of downgraden?</h3>
              <p className="mt-2 text-gray-600">
                Ja, u kunt op elk moment upgraden naar een hoger plan. Het verschil wordt 
                pro-rata berekend. Downgraden is mogelijk aan het einde van uw facturatieperiode.
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900">Wat gebeurt er na de proefperiode?</h3>
              <p className="mt-2 text-gray-600">
                Na de 14-daagse proefperiode wordt uw account automatisch omgezet naar het 
                gekozen plan. U ontvangt tijdig een herinnering.
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900">Hoe werkt de factureiring?</h3>
              <p className="mt-2 text-gray-600">
                U ontvangt maandelijks of jaarlijks een factuur, afhankelijk van uw keuze. 
                Betaling is mogelijk via iDEAL, creditcard of automatische incasso.
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900">Is er een opzegbertermijn?</h3>
              <p className="mt-2 text-gray-600">
                Nee, u kunt op elk moment opzeggen. Na opzegging heeft u nog toegang tot het 
                einde van uw betaalde periode.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 gradient-hero">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white">
            Hulp Nodig bij het Kiezen?
          </h2>
          <p className="mt-4 text-lg text-white/80 max-w-2xl mx-auto">
            Ons team staat klaar om u te adviseren over de beste oplossing voor uw organisatie.
          </p>
          <Link to="/contact" className="mt-8 btn-gold inline-flex">
            Plan een Demo
          </Link>
        </div>
      </section>
    </div>
  );
};

export default PricingPage;
