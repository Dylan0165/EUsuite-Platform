import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Cloud,
  Mail,
  Video,
  HardDrive,
  Users,
  Shield,
  Zap,
  Globe,
  ArrowRight,
  Check,
  Star,
} from 'lucide-react';

const features = [
  {
    icon: HardDrive,
    title: 'EUCloud',
    description: 'Veilige cloud opslag met end-to-end encryptie. Deel bestanden moeiteloos.',
  },
  {
    icon: Mail,
    title: 'EUMail',
    description: 'Professionele zakelijke e-mail met custom domein en spam bescherming.',
  },
  {
    icon: Video,
    title: 'EUGroups',
    description: 'Video conferencing en team messaging in één krachtige applicatie.',
  },
  {
    icon: Users,
    title: 'EUType',
    description: 'Realtime document samenwerking zoals Google Docs, maar dan privé.',
  },
];

const benefits = [
  'Onbeperkt aantal gebruikers',
  'Nederlandse datacenter',
  'GDPR-compliant',
  '24/7 support',
  'Custom branding',
  'API toegang',
];

const testimonials = [
  {
    name: 'Lisa van der Berg',
    role: 'CEO, TechStart BV',
    content: 'EUSuite heeft onze workflow compleet getransformeerd. Alles in één platform, geen gedoe meer met 10 verschillende tools.',
    rating: 5,
  },
  {
    name: 'Mark Jansen',
    role: 'IT Manager, Bouwgroep NL',
    content: 'De beveiliging en GDPR-compliance waren voor ons doorslaggevend. Eindelijk kunnen we veilig samenwerken.',
    rating: 5,
  },
  {
    name: 'Sarah de Vries',
    role: 'Founder, CreativeHub',
    content: 'De prijs-kwaliteitverhouding is ongeëvenaard. We besparen nu €500 per maand vergeleken met onze oude setup.',
    rating: 5,
  },
];

const stats = [
  { value: '500+', label: 'Bedrijven' },
  { value: '10K+', label: 'Gebruikers' },
  { value: '99.9%', label: 'Uptime' },
  { value: '24/7', label: 'Support' },
];

export default function LandingPage() {
  return (
    <div className="overflow-hidden">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary-50 via-white to-primary-50 py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight"
            >
              Jouw bedrijf,{' '}
              <span className="text-primary-600">onze cloud</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mt-6 text-xl text-gray-600 max-w-2xl mx-auto"
            >
              De complete SaaS-oplossing voor moderne bedrijven. 
              Cloud opslag, e-mail, video conferencing en meer - alles in één platform.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-10 flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Link to="/register" className="btn-primary text-lg">
                Start Gratis Trial
                <ArrowRight className="inline-block ml-2 w-5 h-5" />
              </Link>
              <Link to="/features" className="btn-secondary text-lg">
                Bekijk Features
              </Link>
            </motion.div>
          </div>

          {/* Hero Image/Mockup */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-16 relative"
          >
            <div className="bg-white rounded-2xl shadow-2xl p-4 max-w-5xl mx-auto">
              <div className="bg-gradient-to-br from-primary-600 to-primary-800 rounded-xl p-8 text-white">
                <div className="flex items-center gap-2 mb-6">
                  <Cloud className="w-8 h-8" />
                  <span className="text-xl font-bold">EUSuite Dashboard</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {features.map((feature, index) => (
                    <div
                      key={index}
                      className="bg-white/10 backdrop-blur rounded-lg p-4 text-center"
                    >
                      <feature.icon className="w-8 h-8 mx-auto mb-2" />
                      <p className="font-medium">{feature.title}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-white border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <p className="text-3xl md:text-4xl font-bold text-primary-600">
                  {stat.value}
                </p>
                <p className="text-gray-600 mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="section-heading">Alles wat je nodig hebt</h2>
            <p className="section-subheading mt-4">
              Van cloud opslag tot video conferencing - één platform voor al je bedrijfstools.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white p-6 rounded-xl shadow-sm hover:shadow-lg transition-shadow"
              >
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="section-heading">
                Waarom kiezen voor{' '}
                <span className="text-primary-600">EUSuite</span>?
              </h2>
              <p className="mt-4 text-gray-600">
                Wij begrijpen wat moderne bedrijven nodig hebben. 
                Daarom hebben we een platform gebouwd dat veilig, snel en gebruiksvriendelijk is.
              </p>
              <ul className="mt-8 space-y-4">
                {benefits.map((benefit, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-green-600" />
                    </div>
                    <span className="text-gray-700">{benefit}</span>
                  </motion.li>
                ))}
              </ul>
              <Link to="/features" className="btn-primary inline-block mt-8">
                Meer over Features
              </Link>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-primary-600 to-primary-800 rounded-2xl p-8 text-white">
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <Shield className="w-10 h-10" />
                    <div>
                      <h4 className="font-semibold">Enterprise Beveiliging</h4>
                      <p className="text-primary-100 text-sm">
                        End-to-end encryptie & 2FA
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Zap className="w-10 h-10" />
                    <div>
                      <h4 className="font-semibold">Razendsnel</h4>
                      <p className="text-primary-100 text-sm">
                        CDN wereldwijd & NVMe storage
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Globe className="w-10 h-10" />
                    <div>
                      <h4 className="font-semibold">EU Datacenter</h4>
                      <p className="text-primary-100 text-sm">
                        Data blijft in Europa
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="section-heading">Wat onze klanten zeggen</h2>
            <p className="section-subheading mt-4">
              Ontdek waarom honderden bedrijven voor EUSuite kiezen.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white p-6 rounded-xl shadow-sm"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-5 h-5 text-yellow-400 fill-yellow-400"
                    />
                  ))}
                </div>
                <p className="text-gray-600 mb-4">"{testimonial.content}"</p>
                <div className="border-t pt-4">
                  <p className="font-semibold">{testimonial.name}</p>
                  <p className="text-gray-500 text-sm">{testimonial.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            Klaar om te starten?
          </h2>
          <p className="mt-4 text-xl text-primary-100 max-w-2xl mx-auto">
            Probeer EUSuite 14 dagen gratis. Geen creditcard nodig.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="px-8 py-4 bg-white text-primary-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
            >
              Start Gratis Trial
            </Link>
            <Link
              to="/contact"
              className="px-8 py-4 bg-transparent text-white font-semibold rounded-lg border-2 border-white hover:bg-white/10 transition-colors"
            >
              Neem Contact Op
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
