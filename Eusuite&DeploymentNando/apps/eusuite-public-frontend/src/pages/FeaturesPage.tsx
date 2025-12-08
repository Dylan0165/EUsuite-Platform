import { FC } from 'react';
import {
  CloudIcon,
  EnvelopeIcon,
  DocumentTextIcon,
  UsersIcon,
  ShieldCheckIcon,
  LockClosedIcon,
  ServerStackIcon,
  CubeTransparentIcon,
  ArrowPathIcon,
  ChartBarIcon,
  DevicePhoneMobileIcon,
  GlobeEuropeAfricaIcon,
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

const apps = [
  {
    name: 'EUCloud',
    description: 'Veilige cloudopslag voor al uw bestanden. Synchroniseer, deel en werk samen vanuit de cloud.',
    icon: CloudIcon,
    features: ['Tot 1TB opslag', 'End-to-end encryptie', 'Versie historie', 'Delen met wachtwoord'],
  },
  {
    name: 'EUMail',
    description: 'Professionele email hosting met eigen domein. Spam-vrij en volledig beveiligd.',
    icon: EnvelopeIcon,
    features: ['Custom domeinen', 'Spam filtering', 'IMAP/SMTP', 'Email aliassen'],
  },
  {
    name: 'EUType',
    description: 'Maak en bewerk documenten, spreadsheets en presentaties direct in uw browser.',
    icon: DocumentTextIcon,
    features: ['Realtime samenwerken', 'Office compatibel', 'Templates', 'Export naar PDF'],
  },
  {
    name: 'EUGroups',
    description: 'Team communicatie en samenwerking. Chat, video calls en project management.',
    icon: UsersIcon,
    features: ['Team chats', 'Video conferencing', 'File sharing', 'Integraties'],
  },
];

const platformFeatures = [
  {
    name: 'Data Soevereiniteit',
    description: 'Al uw gegevens blijven binnen de EU grenzen, gehost in gecertificeerde datacenters.',
    icon: GlobeEuropeAfricaIcon,
  },
  {
    name: 'End-to-End Encryptie',
    description: 'Uw data is versleuteld in transit en at rest. Alleen u heeft de sleutels.',
    icon: LockClosedIcon,
  },
  {
    name: 'GDPR Compliant',
    description: 'Volledig voldoen aan de AVG/GDPR wetgeving. DPA standaard inbegrepen.',
    icon: ShieldCheckIcon,
  },
  {
    name: 'Geïsoleerde Omgeving',
    description: 'Elke organisatie draait in een eigen namespace met dedicated resources.',
    icon: ServerStackIcon,
  },
  {
    name: 'Auto-scaling',
    description: 'Automatisch opschalen wanneer uw team groeit. Betaal alleen wat u gebruikt.',
    icon: ChartBarIcon,
  },
  {
    name: 'Daily Backups',
    description: 'Dagelijkse backups met 30 dagen retentie. Herstel op elk moment.',
    icon: ArrowPathIcon,
  },
  {
    name: 'Multi-platform',
    description: 'Werk naadloos op web, desktop en mobiel. Native apps voor alle platforms.',
    icon: DevicePhoneMobileIcon,
  },
  {
    name: 'Open Standards',
    description: 'Gebaseerd op open standaarden. Geen vendor lock-in, export uw data altijd.',
    icon: CubeTransparentIcon,
  },
];

const FeaturesPage: FC = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="gradient-hero py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-white">
            Alles wat u Nodig Heeft
          </h1>
          <p className="mt-4 text-xl text-white/80 max-w-2xl mx-auto">
            Ontdek alle functionaliteiten van het EUSuite platform. Gebouwd voor 
            productiviteit, ontworpen voor veiligheid.
          </p>
        </div>
      </section>

      {/* Apps Section */}
      <section className="py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-gray-900">Onze Applicaties</h2>
            <p className="mt-4 text-lg text-gray-600">
              Vier krachtige applicaties die naadloos samenwerken.
            </p>
          </div>

          <div className="space-y-16">
            {apps.map((app, index) => (
              <div
                key={app.name}
                className={`grid lg:grid-cols-2 gap-12 items-center ${
                  index % 2 === 1 ? 'lg:flex-row-reverse' : ''
                }`}
              >
                <div className={index % 2 === 1 ? 'lg:order-2' : ''}>
                  <div className="w-16 h-16 rounded-2xl bg-primary-100 flex items-center justify-center mb-6">
                    <app.icon className="h-8 w-8 text-primary-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">{app.name}</h3>
                  <p className="mt-4 text-lg text-gray-600">{app.description}</p>
                  <ul className="mt-6 space-y-3">
                    {app.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                          <span className="text-green-600 text-sm">✓</span>
                        </div>
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className={`bg-gray-100 rounded-2xl h-80 flex items-center justify-center ${
                  index % 2 === 1 ? 'lg:order-1' : ''
                }`}>
                  <app.icon className="h-24 w-24 text-gray-300" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform Features */}
      <section className="py-24 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-gray-900">Platform Functionaliteiten</h2>
            <p className="mt-4 text-lg text-gray-600">
              Gebouwd op enterprise-grade infrastructuur met veiligheid als prioriteit.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {platformFeatures.map((feature) => (
              <div key={feature.name} className="card">
                <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
                  <feature.icon className="h-6 w-6 text-primary-600" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">{feature.name}</h3>
                <p className="mt-2 text-gray-600 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Integration Section */}
      <section id="integrations" className="py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-gray-900">Integraties</h2>
            <p className="mt-4 text-lg text-gray-600">
              Verbind EUSuite met uw favoriete tools en diensten.
            </p>
          </div>

          <div className="grid grid-cols-3 md:grid-cols-6 gap-8">
            {['Slack', 'Teams', 'Jira', 'Notion', 'Zapier', 'Webhook'].map((integration) => (
              <div
                key={integration}
                className="aspect-square bg-gray-100 rounded-2xl flex items-center justify-center hover:bg-gray-200 transition-colors cursor-pointer"
              >
                <span className="font-semibold text-gray-500">{integration}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 gradient-hero">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white">
            Klaar om te Beginnen?
          </h2>
          <p className="mt-4 text-xl text-white/80 max-w-2xl mx-auto">
            Probeer alle functies 14 dagen gratis uit.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register" className="btn-gold text-lg px-8 py-4">
              Start Gratis Proefperiode
            </Link>
            <Link to="/pricing" className="btn-secondary bg-transparent text-white border-white/30 hover:bg-white/10 text-lg px-8 py-4">
              Bekijk Prijzen
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default FeaturesPage;
