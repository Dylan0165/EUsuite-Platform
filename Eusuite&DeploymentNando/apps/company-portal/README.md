# Company Portal

Het bedrijfsadmin portaal voor EUSuite - waar bedrijfsadmins hun organisatie beheren.

## 🎯 Doel

Dit is Tier 2 van de 3-tier architectuur. Hier loggen bedrijfsadmins in om:
- Gebruikers te beheren
- EUSuite apps aan/uit te zetten
- Bedrijfsinstellingen te configureren
- Statistieken te bekijken

## 🏗️ Architectuur

```
┌─────────────────────────────────────────────────────────────────┐
│  Tier 1: Publieke Website (eusuite-website)                     │
│  - Marketing & registratie                                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Tier 2: Company Portal (Deze app) ← HIER                       │
│  - Multi-tenant login (bedrijf.eusuite.eu)                       │
│  - Gebruikersbeheer                                              │
│  - App configuratie                                              │
│  - Bedrijfsinstellingen                                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Tier 3: Superadmin Portal (euadmin)                            │
│  - Alleen voor platform eigenaar                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 📁 Project Structuur

```
company-portal/
├── src/
│   ├── api/
│   │   └── client.ts        # API client met Axios
│   ├── components/
│   │   └── Layout.tsx       # Sidebar layout
│   ├── pages/
│   │   ├── LoginPage.tsx    # Multi-tenant login
│   │   ├── DashboardPage.tsx # Overzicht
│   │   ├── UsersPage.tsx    # Gebruikersbeheer
│   │   ├── AppsPage.tsx     # App toggles
│   │   └── SettingsPage.tsx # Instellingen
│   ├── store/
│   │   └── authStore.ts     # Zustand auth state
│   ├── App.tsx              # Router
│   ├── main.tsx             # Entry
│   └── index.css            # Tailwind
├── Dockerfile
├── nginx.conf
└── package.json
```

## 📄 Pagina's

### Login (/login)
- Multi-tenant login: bedrijf slug + email + wachtwoord
- Pre-fill company slug vanuit URL parameter

### Dashboard (/)
- Stats: gebruikers, opslag, apps
- Grafieken: actieve gebruikers, opslaggebruik
- Snelle acties

### Gebruikers (/users)
- Lijst van alle bedrijfsgebruikers
- Toevoegen / verwijderen
- Uitnodigingen versturen
- Rollen toewijzen

### Apps (/apps)
- Toggle om apps aan/uit te zetten
- Status: active, deploying, inactive
- Links naar actieve apps

### Instellingen (/settings)
- Bedrijfsnaam & logo
- Branding kleuren
- Tijdzone & taal
- Custom domein

## 🔐 Authenticatie

Login flow:
1. Gebruiker voert bedrijf slug in
2. System zoekt bedrijf op
3. Credentials worden gevalideerd tegen bedrijf-specifieke users
4. JWT token met company_id claim
5. Alle API calls bevatten company context

## 🚀 Development

```bash
npm install
npm run dev    # http://localhost:5191
```

## 🐳 Docker

```bash
docker build -t company-portal .
docker run -p 8080:80 company-portal
```

## 📱 Tech Stack

- React 18 + TypeScript
- Vite 5
- Tailwind CSS
- Zustand (state management)
- Axios (HTTP client)
- Recharts (grafieken)
- date-fns (datums)
- Lucide React (icons)
