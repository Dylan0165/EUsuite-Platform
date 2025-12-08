import { FC, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { publicAPI } from '../api/client';
import {
  CloudIcon,
  EnvelopeIcon,
  DocumentTextIcon,
  UsersIcon,
  ShieldCheckIcon,
  ServerStackIcon,

  ChartBarIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  StarIcon,
} from '@heroicons/react/24/outline';

interface AppInfo {
  id: string;
  name: string;
  description: string;
  icon: any;
}

const apps: AppInfo[] = [
  {
    id: 'eucloud',
    name: 'EUCloud',
    description: 'Veilige cloudopslag voor al uw bestanden',
    icon: CloudIcon,
  },
  {
    id: 'eumail',
    name: 'EUMail',
    description: 'Professionele email hosting',
    icon: EnvelopeIcon,
  },
  {
    id: 'eutype',
    name: 'EUType',
    description: 'Documenten maken en bewerken',
    icon: DocumentTextIcon,
  },
  {
    id: 'eugroups',
    name: 'EUGroups',
    description: 'Team communicatie en samenwerking',
    icon: UsersIcon,
  },
];

const features = [
  {
    name: '100% EU Gehost',
    description: 'Al uw data blijft binnen de Europese Unie',
    icon: ShieldCheckIcon,
  },
  {
    name: 'GDPR Compliant',
    description: 'Volledig voldoen aan de AVG wetgeving',
    icon: CheckCircleIcon,
  },
  {
    name: 'Eigen Infrastructuur',
    description: 'Geïsoleerde omgeving voor uw organisatie',
    icon: ServerStackIcon,
  },
  {
    name: 'Schaalbaar',
    description: 'Groei mee met uw organisatie',
    icon: ChartBarIcon,
  },
];

const LandingPage: FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [testimonials, setTestimonials] = useState<any[]>([]);

  useEffect(() => {
    // Fetch stats and testimonials
    publicAPI.getStats().then((res) => setStats(res.data)).catch(() => {});
    publicAPI.getTestimonials().then((res) => setTestimonials(res.data)).catch(() => {});
  }, []);

  return (
    <div className="overflow-hidden">
      {/* Hero Section */}
      <section className="relative gradient-hero min-h-[90vh] flex items-center">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-24 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-white/90 text-sm mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-gold-400"></span>
              </span>
              Nieuw: EUGroups nu beschikbaar
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight">
              De Complete{' '}
              <span className="text-gold-400">Digitale Werkplek</span>{' '}
              voor Europa
            </h1>
            
            <p className="mt-6 text-xl text-white/80 max-w-2xl mx-auto">
              Cloudopslag, email, documenten en communicatie. Alles wat uw organisatie 
              nodig heeft, veilig gehost in de EU en volledig GDPR compliant.
            </p>
            
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register" className="btn-gold text-lg px-8 py-4 animate-pulse-gold">
                Start Gratis Proefperiode
                <ArrowRightIcon className="ml-2 h-5 w-5" />
              </Link>
              <Link to="/pricing" className="btn-secondary bg-transparent text-white border-white/30 hover:bg-white/10 text-lg px-8 py-4">
                Bekijk Prijzen
              </Link>
            </div>
            
            <p className="mt-6 text-sm text-white/60">
              14 dagen gratis • Geen creditcard nodig • Annuleer wanneer je wilt
            </p>
          </div>
        </div>
        
        {/* Wave decoration */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="white"/>
          </svg>
        </div>
      </section>

      {/* Apps Section */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Eén Platform, Alle Tools
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Alles wat uw team nodig heeft om productief te werken, geïntegreerd in één naadloze ervaring.
            </p>
          </div>
          
          <div className="mt-16 grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {apps.map((app) => (
              <div
                key={app.id}
                className="card hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group"
              >
                <div className="w-14 h-14 rounded-xl bg-primary-100 flex items-center justify-center group-hover:bg-primary-600 transition-colors">
                  <app.icon className="h-7 w-7 text-primary-600 group-hover:text-white transition-colors" />
                </div>
                <h3 className="mt-4 text-xl font-semibold text-gray-900">{app.name}</h3>
                <p className="mt-2 text-gray-600">{app.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
                Gebouwd voor{' '}
                <span className="text-primary-600">Europese Bedrijven</span>
              </h2>
              <p className="mt-4 text-lg text-gray-600">
                Wij begrijpen de unieke eisen van Europese organisaties. Daarom is elk 
                aspect van EUSuite ontworpen met privacy, compliance en soevereiniteit in gedachten.
              </p>
              
              <div className="mt-10 space-y-6">
                {features.map((feature) => (
                  <div key={feature.name} className="flex gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary-100 flex items-center justify-center">
                      <feature.icon className="h-6 w-6 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{feature.name}</h3>
                      <p className="text-gray-600">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary-600 to-primary-800 rounded-3xl transform rotate-3" />
              <div className="relative bg-white rounded-3xl shadow-2xl p-8">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <span>dashboard.eusuite.eu</span>
                </div>
                <img
                  src="/dashboard-preview.png"
                  alt="EUSuite Dashboard"
                  className="rounded-xl w-full"
                  onError={(e) => {
                    e.currentTarget.src = 'https://placehold.co/600x400/1e5631/white?text=EUSuite+Dashboard';
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-primary-600">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-4xl sm:text-5xl font-bold text-white">
                {stats?.companies || '500+'}
              </p>
              <p className="mt-2 text-primary-100">Bedrijven</p>
            </div>
            <div>
              <p className="text-4xl sm:text-5xl font-bold text-white">
                {stats?.users || '10K+'}
              </p>
              <p className="mt-2 text-primary-100">Gebruikers</p>
            </div>
            <div>
              <p className="text-4xl sm:text-5xl font-bold text-white">99.9%</p>
              <p className="mt-2 text-primary-100">Uptime</p>
            </div>
            <div>
              <p className="text-4xl sm:text-5xl font-bold text-white">100%</p>
              <p className="mt-2 text-primary-100">EU Gehost</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      {testimonials.length > 0 && (
        <section className="py-24 bg-white">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
                Wat Onze Klanten Zeggen
              </h2>
            </div>
            
            <div className="mt-16 grid md:grid-cols-3 gap-8">
              {testimonials.slice(0, 3).map((testimonial, index) => (
                <div key={index} className="card">
                  <div className="flex gap-1 text-gold-400">
                    {[...Array(5)].map((_, i) => (
                      <StarIcon key={i} className="h-5 w-5 fill-current" />
                    ))}
                  </div>
                  <p className="mt-4 text-gray-600 italic">"{testimonial.quote}"</p>
                  <div className="mt-6 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                      <span className="font-bold text-primary-600">
                        {testimonial.name?.charAt(0) || 'A'}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{testimonial.name}</p>
                      <p className="text-sm text-gray-500">{testimonial.company}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-24 bg-gray-900">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            Klaar om te Starten?
          </h2>
          <p className="mt-4 text-xl text-gray-400 max-w-2xl mx-auto">
            Probeer EUSuite 14 dagen gratis. Geen creditcard nodig, geen verplichtingen.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register" className="btn-gold text-lg px-8 py-4">
              Start Gratis Proefperiode
            </Link>
            <Link to="/contact" className="btn-secondary text-lg px-8 py-4">
              Neem Contact Op
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
