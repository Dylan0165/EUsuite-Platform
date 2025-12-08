import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, X, HelpCircle } from 'lucide-react';

const plans = [
  {
    name: 'Starter',
    description: 'Perfect voor kleine teams',
    price: { monthly: 29, yearly: 24 },
    features: [
      { name: '10 gebruikers', included: true },
      { name: '50 GB opslag', included: true },
      { name: 'EUCloud', included: true },
      { name: 'EUMail', included: true },
      { name: 'EUGroups', included: false },
      { name: 'EUType', included: false },
      { name: 'Custom branding', included: false },
      { name: 'API toegang', included: false },
      { name: 'Priority support', included: false },
    ],
    cta: 'Start Trial',
    popular: false,
  },
  {
    name: 'Business',
    description: 'Voor groeiende bedrijven',
    price: { monthly: 79, yearly: 66 },
    features: [
      { name: '50 gebruikers', included: true },
      { name: '500 GB opslag', included: true },
      { name: 'EUCloud', included: true },
      { name: 'EUMail', included: true },
      { name: 'EUGroups', included: true },
      { name: 'EUType', included: true },
      { name: 'Custom branding', included: true },
      { name: 'API toegang', included: false },
      { name: 'Priority support', included: false },
    ],
    cta: 'Start Trial',
    popular: true,
  },
  {
    name: 'Enterprise',
    description: 'Voor grote organisaties',
    price: { monthly: 199, yearly: 166 },
    features: [
      { name: 'Onbeperkt gebruikers', included: true },
      { name: '5 TB opslag', included: true },
      { name: 'EUCloud', included: true },
      { name: 'EUMail', included: true },
      { name: 'EUGroups', included: true },
      { name: 'EUType', included: true },
      { name: 'Custom branding', included: true },
      { name: 'API toegang', included: true },
      { name: 'Priority support', included: true },
    ],
    cta: 'Contact Sales',
    popular: false,
  },
];

const faqs = [
  {
    question: 'Kan ik upgraden of downgraden?',
    answer: 'Ja, je kunt op elk moment je plan aanpassen. Bij een upgrade wordt het verschil pro-rata berekend. Bij een downgrade gaat de wijziging in bij je volgende factureringsperiode.',
  },
  {
    question: 'Is er een gratis proefperiode?',
    answer: 'Ja! Je kunt EUSuite 14 dagen gratis uitproberen met alle Business features. Geen creditcard nodig.',
  },
  {
    question: 'Wat gebeurt er met mijn data als ik opzeg?',
    answer: 'Na opzegging heb je 30 dagen om je data te exporteren. Daarna wordt alles permanent verwijderd conform GDPR-richtlijnen.',
  },
  {
    question: 'Zijn er kortingen voor non-profits?',
    answer: 'Ja, non-profits en onderwijsinstellingen krijgen 50% korting. Neem contact met ons op voor meer informatie.',
  },
  {
    question: 'Welke betaalmethodes accepteren jullie?',
    answer: 'We accepteren alle gangbare creditcards, iDEAL, SEPA-incasso en facturering voor Enterprise klanten.',
  },
];

export default function PricingPage() {
  const [isYearly, setIsYearly] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div>
      {/* Hero */}
      <section className="py-20 bg-gradient-to-br from-primary-50 via-white to-primary-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-bold text-gray-900"
          >
            Eenvoudige, transparante prijzen
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-4 text-xl text-gray-600 max-w-2xl mx-auto"
          >
            Kies het plan dat bij jouw bedrijf past. Geen verborgen kosten, 
            geen verrassingen.
          </motion.p>

          {/* Billing Toggle */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-10 flex items-center justify-center gap-4"
          >
            <span className={`text-sm ${!isYearly ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
              Maandelijks
            </span>
            <button
              onClick={() => setIsYearly(!isYearly)}
              className={`relative w-14 h-7 rounded-full transition-colors ${
                isYearly ? 'bg-primary-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                  isYearly ? 'translate-x-8' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-sm ${isYearly ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
              Jaarlijks
              <span className="ml-2 text-green-600 text-xs font-medium">
                Bespaar 20%
              </span>
            </span>
          </motion.div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`relative rounded-2xl p-8 ${
                  plan.popular
                    ? 'bg-primary-600 text-white shadow-xl scale-105'
                    : 'bg-white border border-gray-200'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full">
                      POPULAIRSTE
                    </span>
                  </div>
                )}

                <div className="text-center">
                  <h3 className={`text-xl font-bold ${plan.popular ? 'text-white' : 'text-gray-900'}`}>
                    {plan.name}
                  </h3>
                  <p className={`mt-1 text-sm ${plan.popular ? 'text-primary-100' : 'text-gray-500'}`}>
                    {plan.description}
                  </p>
                  <div className="mt-6">
                    <span className={`text-4xl font-bold ${plan.popular ? 'text-white' : 'text-gray-900'}`}>
                      €{isYearly ? plan.price.yearly : plan.price.monthly}
                    </span>
                    <span className={`text-sm ${plan.popular ? 'text-primary-100' : 'text-gray-500'}`}>
                      /maand
                    </span>
                  </div>
                  {isYearly && (
                    <p className={`text-xs mt-1 ${plan.popular ? 'text-primary-100' : 'text-gray-500'}`}>
                      Gefactureerd als €{plan.price.yearly * 12}/jaar
                    </p>
                  )}
                </div>

                <ul className="mt-8 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature.name} className="flex items-center gap-3">
                      {feature.included ? (
                        <Check className={`w-5 h-5 ${plan.popular ? 'text-green-300' : 'text-green-600'}`} />
                      ) : (
                        <X className={`w-5 h-5 ${plan.popular ? 'text-primary-300' : 'text-gray-300'}`} />
                      )}
                      <span className={`text-sm ${
                        feature.included 
                          ? plan.popular ? 'text-white' : 'text-gray-700'
                          : plan.popular ? 'text-primary-200' : 'text-gray-400'
                      }`}>
                        {feature.name}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link
                  to={plan.name === 'Enterprise' ? '/contact' : '/register'}
                  className={`mt-8 block w-full py-3 text-center font-semibold rounded-lg transition-colors ${
                    plan.popular
                      ? 'bg-white text-primary-600 hover:bg-gray-100'
                      : 'bg-primary-600 text-white hover:bg-primary-700'
                  }`}
                >
                  {plan.cta}
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="section-heading">Veelgestelde Vragen</h2>
            <p className="section-subheading mt-4">
              Heb je nog vragen? We helpen je graag.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-lg shadow-sm"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left"
                >
                  <span className="font-medium text-gray-900">{faq.question}</span>
                  <HelpCircle
                    className={`w-5 h-5 text-gray-400 transition-transform ${
                      openFaq === index ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openFaq === index && (
                  <div className="px-6 pb-4">
                    <p className="text-gray-600">{faq.answer}</p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <p className="text-gray-600">
              Nog vragen?{' '}
              <Link to="/contact" className="text-primary-600 font-medium hover:underline">
                Neem contact op
              </Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
