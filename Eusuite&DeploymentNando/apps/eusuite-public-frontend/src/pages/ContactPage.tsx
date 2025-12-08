import { FC, useState } from 'react';
import { publicAPI } from '../api/client';
import { useForm } from 'react-hook-form';
import {
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

const ContactPage: FC = () => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ContactFormData>();

  const onSubmit = async (data: ContactFormData) => {
    setIsLoading(true);
    try {
      await publicAPI.submitContact(data);
      setIsSubmitted(true);
      toast.success('Bericht verzonden!');
      reset();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Er ging iets mis. Probeer het opnieuw.');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="gradient-hero py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-white">
            Neem Contact Op
          </h1>
          <p className="mt-4 text-xl text-white/80 max-w-2xl mx-auto">
            Heb je een vraag of wil je een demo? We staan klaar om je te helpen.
          </p>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16">
            {/* Contact Info */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Contactgegevens</h2>
              <p className="mt-4 text-gray-600">
                Ons team staat klaar om al je vragen te beantwoorden. Neem gerust 
                contact met ons op via een van de onderstaande kanalen.
              </p>

              <div className="mt-10 space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
                    <EnvelopeIcon className="h-6 w-6 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Email</h3>
                    <p className="text-gray-600">support@eusuite.eu</p>
                    <p className="text-gray-600">sales@eusuite.eu</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
                    <PhoneIcon className="h-6 w-6 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Telefoon</h3>
                    <p className="text-gray-600">+31 (0)20 123 4567</p>
                    <p className="text-sm text-gray-500">Ma-Vr: 09:00 - 17:00</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
                    <MapPinIcon className="h-6 w-6 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Kantoor</h3>
                    <p className="text-gray-600">
                      EUSuite B.V.<br />
                      Herengracht 123<br />
                      1015 BZ Amsterdam<br />
                      Nederland
                    </p>
                  </div>
                </div>
              </div>

              {/* FAQ Link */}
              <div className="mt-10 p-6 bg-gray-50 rounded-xl">
                <h3 className="font-semibold text-gray-900">Veelgestelde Vragen</h3>
                <p className="mt-2 text-gray-600 text-sm">
                  Bekijk onze FAQ voor antwoorden op veelgestelde vragen.
                </p>
                <a href="/pricing#faq" className="mt-3 inline-flex text-primary-600 font-semibold hover:underline">
                  Bekijk FAQ →
                </a>
              </div>
            </div>

            {/* Contact Form */}
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
              {isSubmitted ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircleIcon className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="mt-4 text-xl font-bold text-gray-900">Bericht Verzonden!</h3>
                  <p className="mt-2 text-gray-600">
                    Bedankt voor je bericht. We nemen zo snel mogelijk contact met je op.
                  </p>
                  <button
                    onClick={() => setIsSubmitted(false)}
                    className="mt-6 btn-secondary"
                  >
                    Nieuw Bericht Sturen
                  </button>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-gray-900">Stuur een Bericht</h2>
                  <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5">
                    <div>
                      <label htmlFor="name" className="label">
                        Naam
                      </label>
                      <input
                        id="name"
                        type="text"
                        {...register('name', { required: 'Naam is verplicht' })}
                        className={`input ${errors.name ? 'input-error' : ''}`}
                      />
                      {errors.name && (
                        <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="email" className="label">
                        Email
                      </label>
                      <input
                        id="email"
                        type="email"
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

                    <div>
                      <label htmlFor="subject" className="label">
                        Onderwerp
                      </label>
                      <select
                        id="subject"
                        {...register('subject', { required: 'Selecteer een onderwerp' })}
                        className={`input ${errors.subject ? 'input-error' : ''}`}
                      >
                        <option value="">Selecteer een onderwerp</option>
                        <option value="sales">Verkoop / Demo</option>
                        <option value="support">Technische Support</option>
                        <option value="billing">Facturatie</option>
                        <option value="partnership">Partnership</option>
                        <option value="other">Anders</option>
                      </select>
                      {errors.subject && (
                        <p className="mt-1 text-sm text-red-600">{errors.subject.message}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="message" className="label">
                        Bericht
                      </label>
                      <textarea
                        id="message"
                        rows={5}
                        {...register('message', {
                          required: 'Bericht is verplicht',
                          minLength: {
                            value: 10,
                            message: 'Bericht moet minimaal 10 tekens zijn',
                          },
                        })}
                        className={`input resize-none ${errors.message ? 'input-error' : ''}`}
                      />
                      {errors.message && (
                        <p className="mt-1 text-sm text-red-600">{errors.message.message}</p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="btn-primary w-full py-3"
                    >
                      {isLoading ? <LoadingSpinner size="sm" /> : 'Verstuur Bericht'}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ContactPage;
