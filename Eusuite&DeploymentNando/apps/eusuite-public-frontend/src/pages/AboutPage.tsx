import { FC } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheckIcon,
  GlobeEuropeAfricaIcon,
  UserGroupIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

const team = [
  {
    name: 'Jan de Vries',
    role: 'CEO & Co-founder',
    image: null,
  },
  {
    name: 'Sophie van den Berg',
    role: 'CTO & Co-founder',
    image: null,
  },
  {
    name: 'Tom Jansen',
    role: 'Head of Product',
    image: null,
  },
  {
    name: 'Emma Bakker',
    role: 'Head of Customer Success',
    image: null,
  },
];

const values = [
  {
    name: 'Privacy First',
    description: 'Wij geloven dat privacy een fundamenteel recht is. Daarom bouwen we producten die uw data beschermen.',
    icon: ShieldCheckIcon,
  },
  {
    name: 'Europese Soevereiniteit',
    description: 'Data van Europese bedrijven hoort in Europa. Wij garanderen dat uw data nooit de EU verlaat.',
    icon: GlobeEuropeAfricaIcon,
  },
  {
    name: 'Gebruiker Centraal',
    description: 'We ontwerpen voor mensen, niet voor systemen. Eenvoud en gebruiksgemak staan voorop.',
    icon: UserGroupIcon,
  },
  {
    name: 'Innovatie',
    description: 'We blijven innoveren om u de beste tools te bieden. Open voor feedback en altijd aan het verbeteren.',
    icon: SparklesIcon,
  },
];

const AboutPage: FC = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="gradient-hero py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-white">
            Over EUSuite
          </h1>
          <p className="mt-4 text-xl text-white/80 max-w-2xl mx-auto">
            Wij bouwen de digitale toekomst van Europa. Veilig, soeverein en privacyvriendelijk.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-gray-900">Onze Missie</h2>
            <p className="mt-6 text-lg text-gray-600 leading-relaxed">
              EUSuite is opgericht met één doel: Europese bedrijven voorzien van 
              krachtige, privacy-vriendelijke software die volledig binnen de EU wordt 
              gehost. In een wereld waar data het nieuwe goud is, geloven wij dat 
              organisaties de controle moeten hebben over hun eigen gegevens.
            </p>
            <p className="mt-4 text-lg text-gray-600 leading-relaxed">
              Wij bieden een compleet alternatief voor Amerikaanse cloudoplossingen, 
              zonder concessies te doen aan functionaliteit of gebruiksgemak. Onze 
              suite van applicaties werkt naadloos samen en geeft u alles wat u nodig 
              heeft om productief te zijn.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-24 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-gray-900">Onze Waarden</h2>
            <p className="mt-4 text-lg text-gray-600">
              De principes die ons werk elke dag sturen.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value) => (
              <div key={value.name} className="card text-center">
                <div className="w-14 h-14 mx-auto rounded-xl bg-primary-100 flex items-center justify-center">
                  <value.icon className="h-7 w-7 text-primary-600" />
                </div>
                <h3 className="mt-4 text-xl font-semibold text-gray-900">{value.name}</h3>
                <p className="mt-2 text-gray-600">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-gray-900">Ons Team</h2>
            <p className="mt-4 text-lg text-gray-600">
              De mensen achter EUSuite.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-5xl mx-auto">
            {team.map((member) => (
              <div key={member.name} className="text-center">
                <div className="w-32 h-32 mx-auto rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-4xl font-bold text-gray-400">
                    {member.name.charAt(0)}
                  </span>
                </div>
                <h3 className="mt-4 font-semibold text-gray-900">{member.name}</h3>
                <p className="text-gray-600">{member.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-24 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-gray-900">Onze Reis</h2>
          </div>

          <div className="max-w-3xl mx-auto">
            <div className="space-y-8">
              {[
                { year: '2022', title: 'Oprichting', desc: 'EUSuite wordt opgericht in Amsterdam met de missie om Europese bedrijven te voorzien van privacy-vriendelijke software.' },
                { year: '2023', title: 'Eerste Producten', desc: 'Launch van EUCloud en EUMail. De eerste 100 bedrijven sluiten zich aan.' },
                { year: '2024', title: 'Uitbreiding', desc: 'EUType en EUGroups worden toegevoegd. Het team groeit naar 25 medewerkers.' },
                { year: '2025', title: 'Vandaag', desc: 'Meer dan 500 bedrijven vertrouwen op EUSuite voor hun digitale werkplek.' },
              ].map((item, index) => (
                <div key={item.year} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold">
                      {item.year.slice(-2)}
                    </div>
                    {index < 3 && <div className="w-0.5 h-full bg-primary-200 mt-2" />}
                  </div>
                  <div className="pb-8">
                    <p className="text-sm text-primary-600 font-semibold">{item.year}</p>
                    <h3 className="text-lg font-bold text-gray-900">{item.title}</h3>
                    <p className="mt-1 text-gray-600">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 gradient-hero">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white">
            Word Onderdeel van de EUSuite Community
          </h2>
          <p className="mt-4 text-xl text-white/80 max-w-2xl mx-auto">
            Sluit je aan bij honderden Europese bedrijven die al hebben gekozen voor privacy en soevereiniteit.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register" className="btn-gold text-lg px-8 py-4">
              Start Gratis
            </Link>
            <Link to="/contact" className="btn-secondary bg-transparent text-white border-white/30 hover:bg-white/10 text-lg px-8 py-4">
              Neem Contact Op
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;
