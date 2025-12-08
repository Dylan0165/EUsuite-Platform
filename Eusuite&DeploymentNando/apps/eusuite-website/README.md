# EUSuite Public Website

De publieke marketing website voor EUSuite - de eerste stap in de 3-tier architectuur.

## 🎯 Doel

Deze website dient als de publieke face van EUSuite waar potentiële klanten:
- Informatie kunnen vinden over het platform
- Prijzen en features kunnen bekijken
- Hun bedrijf kunnen registreren voor een account

## 🏗️ Architectuur

```
3-Tier Architectuur:
┌─────────────────────────────────────────────────────────────────┐
│  Tier 1: Publieke Website (Deze app)                            │
│  - Marketing content                                             │
│  - Pricing informatie                                            │
│  - Bedrijfsregistratie                                           │
│  - Geen inlog vereist                                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Tier 2: Company Portal                                         │
│  - Bedrijfsspecifiek dashboard                                   │
│  - Gebruikersbeheer                                              │
│  - EUSuite apps configuratie                                     │
│  - Multi-tenant login                                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Tier 3: Superadmin Portal (euadmin)                            │
│  - Platform-brede administratie                                  │
│  - Alle bedrijven beheren                                        │
│  - Kubernetes deployments                                        │
│  - Alleen voor platform eigenaar                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 📁 Project Structuur

```
eusuite-website/
├── src/
│   ├── components/
│   │   ├── Navbar.tsx       # Navigatie
│   │   └── Footer.tsx       # Footer met links
│   ├── pages/
│   │   ├── LandingPage.tsx  # Homepage met hero
│   │   ├── FeaturesPage.tsx # Feature overzicht
│   │   ├── PricingPage.tsx  # Prijzen & FAQ
│   │   ├── RegisterPage.tsx # 4-staps registratie
│   │   └── ContactPage.tsx  # Contact formulier
│   ├── App.tsx              # Router setup
│   ├── main.tsx             # Entry point
│   └── index.css            # Tailwind styles
├── public/
│   └── favicon.svg          # Site icon
├── Dockerfile               # Container build
├── nginx.conf               # Production server
└── package.json             # Dependencies
```

## 🚀 Development

```bash
# Dependencies installeren
npm install

# Development server starten
npm run dev

# Build voor productie
npm run build

# Preview productie build
npm run preview
```

## 🐳 Docker

```bash
# Image bouwen
docker build -t eusuite-website .

# Container starten
docker run -p 8080:80 eusuite-website
```

## 📝 Pagina's

### Landing Page (/)
- Hero sectie met CTA
- Feature highlights
- Statistieken
- Testimonials
- Call-to-action

### Features (/features)
- EUCloud - Cloud opslag
- EUMail - E-mail
- EUGroups - Video & chat
- EUType - Document samenwerking
- Security features
- Platform features

### Pricing (/pricing)
- 3 plannen: Starter, Business, Enterprise
- Maandelijks/jaarlijks toggle (20% korting)
- Feature vergelijking
- FAQ sectie

### Register (/register)
Multi-staps wizard:
1. Plan kiezen
2. Bedrijfsgegevens
3. Admin account
4. Bevestiging

### Contact (/contact)
- Contact methodes (email, telefoon, adres)
- Contact formulier
- Live chat CTA
- Openingstijden

## 🔗 Integratie

De registratie pagina stuurt een POST naar `/api/v1/public/register` met:

```typescript
{
  company: {
    name: string;
    slug: string;
    industry: string;
    employee_count: string;
    plan: 'starter' | 'business' | 'enterprise';
  },
  admin: {
    first_name: string;
    last_name: string;
    email: string;
    password: string;
  }
}
```

Dit endpoint wordt afgehandeld door de eusuite-website-backend.

## 🎨 Tech Stack

- **React 18** - UI framework
- **Vite 5** - Build tool
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Framer Motion** - Animaties
- **Lucide React** - Icons
- **React Router** - Routing
