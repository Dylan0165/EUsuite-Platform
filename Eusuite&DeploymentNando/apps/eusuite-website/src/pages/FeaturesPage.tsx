import { motion } from 'framer-motion';
import {
  HardDrive,
  Mail,
  Video,
  FileText,
  Shield,
  Zap,
  Globe,
  Lock,
  Users,
  Cloud,
  RefreshCw,
  Smartphone,
} from 'lucide-react';

const mainFeatures = [
  {
    icon: HardDrive,
    title: 'EUCloud',
    subtitle: 'Veilige Cloud Opslag',
    description: 'Bewaar, synchroniseer en deel bestanden veilig met je team. Automatische versioning en end-to-end encryptie.',
    features: [
      'Drag & drop uploaden',
      'Automatische sync',
      'Versiegeschiedenis',
      'Publieke & private links',
      'Folder structuur',
      'Grote bestanden (tot 10GB)',
    ],
    color: 'blue',
  },
  {
    icon: Mail,
    title: 'EUMail',
    subtitle: 'Zakelijke E-mail',
    description: 'Professionele e-mail met je eigen domein. Inclusief kalender, contacten en spam bescherming.',
    features: [
      'Custom domein',
      'Kalender integratie',
      'Contacten sync',
      'Spam & virus filter',
      'Email aliassen',
      'Auto-reply & filters',
    ],
    color: 'green',
  },
  {
    icon: Video,
    title: 'EUGroups',
    subtitle: 'Video & Team Chat',
    description: 'HD video conferencing en realtime messaging voor naadloze samenwerking, waar je ook bent.',
    features: [
      'HD video calls',
      'Scherm delen',
      'Team channels',
      'Direct messages',
      'Opname functie',
      'Tot 100 deelnemers',
    ],
    color: 'purple',
  },
  {
    icon: FileText,
    title: 'EUType',
    subtitle: 'Document Samenwerking',
    description: 'Maak en bewerk documenten samen in realtime. Net als Google Docs, maar dan privé en veilig.',
    features: [
      'Realtime editing',
      'Commenting',
      'Export naar PDF/Word',
      'Templates',
      'Toegangscontrole',
      'Offline modus',
    ],
    color: 'orange',
  },
];

const securityFeatures = [
  {
    icon: Lock,
    title: 'End-to-end Encryptie',
    description: 'Al je data wordt versleuteld met AES-256 voordat het je apparaat verlaat.',
  },
  {
    icon: Shield,
    title: 'GDPR Compliant',
    description: 'Volledig conform Europese privacywetgeving. Data blijft in de EU.',
  },
  {
    icon: Users,
    title: 'Single Sign-On',
    description: 'Integreer met bestaande identity providers zoals Azure AD of Okta.',
  },
  {
    icon: RefreshCw,
    title: 'Automatische Backups',
    description: 'Dagelijkse backups met 30 dagen retentie. Geografisch redundant.',
  },
];

const platformFeatures = [
  {
    icon: Globe,
    title: 'EU Datacenter',
    description: 'Gehost in beveiligde datacenters in Nederland en Duitsland.',
  },
  {
    icon: Zap,
    title: '99.9% Uptime',
    description: 'Enterprise-grade infrastructuur met SLA garantie.',
  },
  {
    icon: Cloud,
    title: 'API & Webhooks',
    description: 'Volledig RESTful API voor integratie met je bestaande tools.',
  },
  {
    icon: Smartphone,
    title: 'Mobile Apps',
    description: 'Native iOS en Android apps voor onderweg.',
  },
];

const colorClasses = {
  blue: 'bg-blue-100 text-blue-600',
  green: 'bg-green-100 text-green-600',
  purple: 'bg-purple-100 text-purple-600',
  orange: 'bg-orange-100 text-orange-600',
};

export default function FeaturesPage() {
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
            Alles in één platform
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-4 text-xl text-gray-600 max-w-2xl mx-auto"
          >
            Ontdek alle tools die EUSuite biedt om jouw bedrijf naar het 
            volgende niveau te tillen.
          </motion.p>
        </div>
      </section>

      {/* Main Features */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-24">
            {mainFeatures.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className={`grid lg:grid-cols-2 gap-12 items-center ${
                  index % 2 === 1 ? 'lg:flex-row-reverse' : ''
                }`}
              >
                <div className={index % 2 === 1 ? 'lg:order-2' : ''}>
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 ${
                    colorClasses[feature.color as keyof typeof colorClasses]
                  }`}>
                    <feature.icon className="w-7 h-7" />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900">{feature.title}</h2>
                  <p className="text-lg text-primary-600 font-medium">{feature.subtitle}</p>
                  <p className="mt-4 text-gray-600">{feature.description}</p>
                  <ul className="mt-6 grid grid-cols-2 gap-3">
                    {feature.features.map((item) => (
                      <li key={item} className="flex items-center gap-2 text-sm text-gray-700">
                        <div className="w-1.5 h-1.5 bg-primary-600 rounded-full" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className={`bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl p-8 aspect-video flex items-center justify-center ${
                  index % 2 === 1 ? 'lg:order-1' : ''
                }`}>
                  <feature.icon className="w-32 h-32 text-gray-300" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Features */}
      <section id="security" className="py-20 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold">
              Enterprise-grade Beveiliging
            </h2>
            <p className="mt-4 text-gray-400 max-w-2xl mx-auto">
              Je data is veilig bij ons. We nemen beveiliging serieus.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {securityFeatures.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className="w-14 h-14 bg-primary-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-gray-400 text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform Features */}
      <section id="integrations" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="section-heading">Platform & Infrastructuur</h2>
            <p className="section-subheading mt-4">
              Gebouwd voor betrouwbaarheid en schaalbaarheid.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {platformFeatures.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-gray-50 rounded-xl p-6"
              >
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{feature.title}</h3>
                <p className="mt-2 text-gray-600 text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            Klaar om aan de slag te gaan?
          </h2>
          <p className="mt-4 text-xl text-primary-100 max-w-2xl mx-auto">
            Start vandaag nog met je gratis trial en ontdek alle mogelijkheden.
          </p>
          <a
            href="/register"
            className="mt-8 inline-block px-8 py-4 bg-white text-primary-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
          >
            Start Gratis Trial
          </a>
        </div>
      </section>
    </div>
  );
}
