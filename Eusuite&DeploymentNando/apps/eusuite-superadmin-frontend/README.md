# EUSuite Superadmin Frontend

De superadmin interface voor het beheren van het volledige EUSuite multi-tenant platform.

## Functionaliteiten

### Dashboard
- Platform-brede statistieken
- Revenue grafieken (MRR/ARR)
- Tenant groei analyse
- Subscription breakdown
- Recente activiteit feed

### Tenant Beheer
- Overzicht van alle tenants
- Tenant creatie met plan selectie
- Status management (active, suspended, cancelled)
- User & storage limiet beheer
- Deployment monitoring per tenant

### Subscription Plans
- Plan management (create, edit, delete)
- Prijs configuratie (maandelijks/jaarlijks)
- Feature lists
- Storage & user limieten

### Deployments
- Alle tenant deployments overzicht
- Start/Stop/Restart acties
- Resource monitoring
- Status tracking

### Facturatie
- Invoice overzicht
- Mark as paid functionaliteit
- PDF download
- Resend invoice

### Support Tickets
- Ticket management
- Real-time chat interface
- Status & priority management
- Assigned admin tracking

### Administrators
- Admin user management
- Role-based access (super_admin, admin, support, viewer)
- MFA status tracking
- Last login monitoring

### Audit Logs
- Complete activity logging
- Filterbaar op action/resource/datum
- IP tracking
- Success/failure status

### System Settings
- General (platform name, timezone, maintenance mode)
- Email (SMTP configuratie)
- Payments (Stripe keys, currency)
- Infrastructure (K8s settings, port ranges)
- Security (session timeout, MFA requirements)
- Branding (colors, logo, favicon)

## Tech Stack

- **React 18** met TypeScript
- **Vite** build tool
- **TailwindCSS** voor styling
- **@tanstack/react-query** voor data fetching
- **Zustand** voor state management
- **react-hook-form** voor formulieren
- **Chart.js** voor grafieken
- **@headlessui/react** voor UI componenten

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Docker

```bash
docker build -t eusuite-superadmin-frontend .
docker run -p 3002:80 eusuite-superadmin-frontend
```

## Environment Variables

- `VITE_API_URL` - URL van de superadmin backend API

## Rollen & Permissies

| Rol | Dashboard | Tenants | Plans | Deployments | Invoices | Tickets | Admins | Audit | Settings |
|-----|-----------|---------|-------|-------------|----------|---------|--------|-------|----------|
| super_admin | ✅ | ✅ CRUD | ✅ CRUD | ✅ CRUD | ✅ CRUD | ✅ CRUD | ✅ CRUD | ✅ | ✅ CRUD |
| admin | ✅ | ✅ CRUD | ✅ Read | ✅ CRUD | ✅ Read | ✅ CRUD | ✅ Read | ✅ | ✅ Read |
| support | ✅ | ✅ Read | ❌ | ✅ Read | ❌ | ✅ CRUD | ❌ | ❌ | ❌ |
| viewer | ✅ | ✅ Read | ❌ | ✅ Read | ❌ | ✅ Read | ❌ | ❌ | ❌ |
