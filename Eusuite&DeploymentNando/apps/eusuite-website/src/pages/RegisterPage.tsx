import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Building, User, Lock, ArrowRight, ArrowLeft } from 'lucide-react';

const plans = [
  { id: 'starter', name: 'Starter', price: '€29', period: '/maand' },
  { id: 'business', name: 'Business', price: '€79', period: '/maand', popular: true },
  { id: 'enterprise', name: 'Enterprise', price: '€199', period: '/maand' },
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    // Step 1: Plan
    plan: 'business',
    // Step 2: Company
    companyName: '',
    companySlug: '',
    industry: '',
    employees: '',
    // Step 3: Admin
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    // Step 4: Confirm
    agreeTerms: false,
    agreeMarketing: false,
  });

  const updateForm = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    
    // Auto-generate slug from company name
    if (field === 'companyName') {
      const slug = (value as string)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setFormData((prev) => ({ ...prev, companySlug: slug }));
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      // Call registration API
      const response = await fetch('/api/v1/public/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: {
            name: formData.companyName,
            slug: formData.companySlug,
            industry: formData.industry,
            employee_count: formData.employees,
            plan: formData.plan,
          },
          admin: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            email: formData.email,
            password: formData.password,
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Registratie mislukt');
      }

      // Success - redirect to success page or company portal
      navigate('/register/success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Er ging iets mis');
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.plan;
      case 2:
        return formData.companyName && formData.companySlug && formData.industry;
      case 3:
        return (
          formData.firstName &&
          formData.lastName &&
          formData.email &&
          formData.password &&
          formData.password === formData.confirmPassword
        );
      case 4:
        return formData.agreeTerms;
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        {/* Progress Steps */}
        <div className="mb-12">
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${
                    step >= s
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {step > s ? <Check className="w-5 h-5" /> : s}
                </div>
                {s < 4 && (
                  <div
                    className={`w-16 h-1 ${
                      step > s ? 'bg-primary-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-sm text-gray-600 px-2">
            <span>Plan</span>
            <span>Bedrijf</span>
            <span>Account</span>
            <span>Bevestig</span>
          </div>
        </div>

        {/* Form Card */}
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="bg-white rounded-2xl shadow-xl p-8"
        >
          {/* Step 1: Choose Plan */}
          {step === 1 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Kies je plan
              </h2>
              <p className="text-gray-600 mb-8">
                Je kunt later altijd upgraden of downgraden.
              </p>

              <div className="space-y-4">
                {plans.map((plan) => (
                  <label
                    key={plan.id}
                    className={`block p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                      formData.plan === plan.id
                        ? 'border-primary-600 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="plan"
                      value={plan.id}
                      checked={formData.plan === plan.id}
                      onChange={(e) => updateForm('plan', e.target.value)}
                      className="sr-only"
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded-full border-2 ${
                            formData.plan === plan.id
                              ? 'border-primary-600 bg-primary-600'
                              : 'border-gray-300'
                          }`}
                        >
                          {formData.plan === plan.id && (
                            <Check className="w-full h-full text-white p-0.5" />
                          )}
                        </div>
                        <div>
                          <span className="font-semibold text-gray-900">
                            {plan.name}
                          </span>
                          {plan.popular && (
                            <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                              Populair
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xl font-bold text-gray-900">
                          {plan.price}
                        </span>
                        <span className="text-gray-500 text-sm">{plan.period}</span>
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              <p className="mt-6 text-sm text-gray-500 text-center">
                14 dagen gratis trial • Geen creditcard nodig
              </p>
            </div>
          )}

          {/* Step 2: Company Info */}
          {step === 2 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <Building className="w-8 h-8 text-primary-600" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Bedrijfsgegevens
                  </h2>
                  <p className="text-gray-600">Vertel ons over je bedrijf</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bedrijfsnaam *
                  </label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => updateForm('companyName', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Jouw Bedrijf BV"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subdomein *
                  </label>
                  <div className="flex">
                    <input
                      type="text"
                      value={formData.companySlug}
                      onChange={(e) => updateForm('companySlug', e.target.value)}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="jouw-bedrijf"
                    />
                    <span className="px-4 py-3 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg text-gray-500">
                      .eusuite.eu
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Industrie *
                  </label>
                  <select
                    value={formData.industry}
                    onChange={(e) => updateForm('industry', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Selecteer...</option>
                    <option value="tech">Technologie</option>
                    <option value="finance">Financiën</option>
                    <option value="healthcare">Gezondheidszorg</option>
                    <option value="education">Onderwijs</option>
                    <option value="retail">Retail</option>
                    <option value="manufacturing">Productie</option>
                    <option value="consulting">Consulting</option>
                    <option value="other">Anders</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Aantal medewerkers
                  </label>
                  <select
                    value={formData.employees}
                    onChange={(e) => updateForm('employees', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Selecteer...</option>
                    <option value="1-10">1-10</option>
                    <option value="11-50">11-50</option>
                    <option value="51-200">51-200</option>
                    <option value="201-500">201-500</option>
                    <option value="500+">500+</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Admin Account */}
          {step === 3 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <User className="w-8 h-8 text-primary-600" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Admin Account
                  </h2>
                  <p className="text-gray-600">Maak je beheerdersaccount</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Voornaam *
                    </label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => updateForm('firstName', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Jan"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Achternaam *
                    </label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => updateForm('lastName', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Jansen"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    E-mailadres *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateForm('email', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="jan@jouwbedrijf.nl"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Wachtwoord *
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => updateForm('password', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="••••••••"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Minimaal 8 karakters met cijfers en speciale tekens
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bevestig wachtwoord *
                  </label>
                  <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => updateForm('confirmPassword', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="••••••••"
                  />
                  {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                    <p className="text-xs text-red-500 mt-1">
                      Wachtwoorden komen niet overeen
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Confirmation */}
          {step === 4 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <Lock className="w-8 h-8 text-primary-600" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Bevestig Registratie
                  </h2>
                  <p className="text-gray-600">Controleer je gegevens</p>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-gray-50 rounded-xl p-6 mb-6 space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Plan</span>
                  <span className="font-medium capitalize">{formData.plan}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Bedrijf</span>
                  <span className="font-medium">{formData.companyName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Subdomein</span>
                  <span className="font-medium">{formData.companySlug}.eusuite.eu</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Admin</span>
                  <span className="font-medium">{formData.email}</span>
                </div>
              </div>

              {/* Terms */}
              <div className="space-y-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.agreeTerms}
                    onChange={(e) => updateForm('agreeTerms', e.target.checked)}
                    className="mt-1 w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-600">
                    Ik ga akkoord met de{' '}
                    <a href="/terms" className="text-primary-600 hover:underline">
                      Algemene Voorwaarden
                    </a>{' '}
                    en het{' '}
                    <a href="/privacy" className="text-primary-600 hover:underline">
                      Privacybeleid
                    </a>{' '}
                    *
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.agreeMarketing}
                    onChange={(e) => updateForm('agreeMarketing', e.target.checked)}
                    className="mt-1 w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-600">
                    Ik wil graag updates en nieuws ontvangen over EUSuite
                  </span>
                </label>
              </div>

              {error && (
                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
            {step > 1 ? (
              <button
                onClick={() => setStep(step - 1)}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4" />
                Terug
              </button>
            ) : (
              <div />
            )}

            {step < 4 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="flex items-center gap-2 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Volgende
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!canProceed() || loading}
                className="flex items-center gap-2 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Bezig...' : 'Registreer Bedrijf'}
                {!loading && <Check className="w-4 h-4" />}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
