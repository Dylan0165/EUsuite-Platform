import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, Send, MessageSquare, Clock } from 'lucide-react';

const contactMethods = [
  {
    icon: Mail,
    title: 'E-mail',
    description: 'Stuur ons een e-mail',
    value: 'info@eusuite.eu',
    link: 'mailto:info@eusuite.eu',
  },
  {
    icon: Phone,
    title: 'Telefoon',
    description: 'Bel ons op werkdagen',
    value: '+31 (0)20 123 4567',
    link: 'tel:+31201234567',
  },
  {
    icon: MapPin,
    title: 'Adres',
    description: 'Kom langs op kantoor',
    value: 'Amsterdam, Nederland',
    link: 'https://maps.google.com',
  },
];

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    subject: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    setSubmitted(true);
    setLoading(false);
  };

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
            Neem Contact Op
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-4 text-xl text-gray-600 max-w-2xl mx-auto"
          >
            Heb je vragen of wil je meer weten? Wij helpen je graag.
          </motion.p>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="py-12 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            {contactMethods.map((method, index) => (
              <motion.a
                key={method.title}
                href={method.link}
                target={method.title === 'Adres' ? '_blank' : undefined}
                rel={method.title === 'Adres' ? 'noopener noreferrer' : undefined}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-4 p-6 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <method.icon className="w-6 h-6 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{method.title}</h3>
                  <p className="text-sm text-gray-500">{method.description}</p>
                  <p className="text-primary-600 font-medium">{method.value}</p>
                </div>
              </motion.a>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12"
            >
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Send className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Bericht Verzonden!
              </h2>
              <p className="text-gray-600">
                Bedankt voor je bericht. We nemen zo snel mogelijk contact met je op.
              </p>
            </motion.div>
          ) : (
            <div>
              <div className="text-center mb-12">
                <h2 className="section-heading">Stuur ons een bericht</h2>
                <p className="section-subheading mt-4">
                  Vul het formulier in en we reageren binnen 24 uur.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Naam *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Jan Jansen"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      E-mail *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="jan@bedrijf.nl"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bedrijf
                    </label>
                    <input
                      type="text"
                      value={formData.company}
                      onChange={(e) =>
                        setFormData({ ...formData, company: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Bedrijf BV"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Onderwerp *
                    </label>
                    <select
                      required
                      value={formData.subject}
                      onChange={(e) =>
                        setFormData({ ...formData, subject: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="">Selecteer...</option>
                      <option value="sales">Verkoop / Offerte</option>
                      <option value="support">Technische Ondersteuning</option>
                      <option value="billing">Facturering</option>
                      <option value="partnership">Partnership</option>
                      <option value="other">Anders</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bericht *
                  </label>
                  <textarea
                    required
                    rows={6}
                    value={formData.message}
                    onChange={(e) =>
                      setFormData({ ...formData, message: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                    placeholder="Hoe kunnen we je helpen?"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    'Verzenden...'
                  ) : (
                    <>
                      Verstuur Bericht
                      <Send className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </section>

      {/* FAQ CTA */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white rounded-xl p-8">
              <div className="flex items-center gap-4 mb-4">
                <MessageSquare className="w-10 h-10 text-primary-600" />
                <h3 className="text-xl font-bold text-gray-900">Live Chat</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Start een live chat met ons support team voor directe hulp.
              </p>
              <button className="text-primary-600 font-medium hover:underline">
                Start Chat →
              </button>
            </div>

            <div className="bg-white rounded-xl p-8">
              <div className="flex items-center gap-4 mb-4">
                <Clock className="w-10 h-10 text-primary-600" />
                <h3 className="text-xl font-bold text-gray-900">Openingstijden</h3>
              </div>
              <div className="text-gray-600 space-y-1">
                <p>Maandag - Vrijdag: 09:00 - 18:00</p>
                <p>Zaterdag: 10:00 - 14:00</p>
                <p>Zondag: Gesloten</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
