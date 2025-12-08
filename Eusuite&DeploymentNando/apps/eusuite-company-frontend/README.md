# EUSuite Company Admin Portal

Company-level administration portal for managing tenants, users, deployments, branding, and storage policies.

## Features

- **Dashboard**: Overview of company statistics, user activity, and deployments
- **User Management**: CRUD operations for company users with role-based permissions
- **Department Management**: Organize users into departments
- **App Deployments**: Deploy and manage EUSuite applications (EUCloud, EUMail, EUType, EUGroups)
- **Branding**: Customize colors, logos, and theme for your organization
- **Storage Policies**: Configure storage quotas and limits per user role
- **Audit Logs**: Track all actions within the organization
- **Notifications**: View and manage system notifications
- **Settings**: Configure company-wide settings

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **TailwindCSS** for styling
- **Zustand** for state management
- **React Hook Form** for form handling
- **Chart.js** for analytics charts
- **React Dropzone** for file uploads
- **Headless UI** for accessible components
- **Heroicons** for icons
- **React Hot Toast** for notifications

## Dynamic Branding

The portal supports dynamic branding per tenant:
- Colors are applied via CSS variables
- Logo can be uploaded and displayed
- Theme preferences are persisted

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Environment Variables

Create a `.env` file:

```env
VITE_API_URL=http://localhost:8000
VITE_TENANT_ID=demo-company
```

## Docker

```bash
# Build image
docker build -t eusuite-company-frontend .

# Run container
docker run -p 3000:80 eusuite-company-frontend
```

## API Integration

The portal communicates with `eusuite-company-backend` via:
- JWT authentication
- Tenant isolation via `X-Tenant-ID` header
- RESTful endpoints

## Directory Structure

```
src/
├── api/
│   └── client.ts          # Axios client with interceptors
├── components/
│   ├── common/            # Shared components
│   └── layout/            # Layout components
├── pages/
│   ├── LoginPage.tsx
│   ├── DashboardPage.tsx
│   ├── UsersPage.tsx
│   ├── UserDetailPage.tsx
│   ├── DepartmentsPage.tsx
│   ├── DeploymentsPage.tsx
│   ├── BrandingPage.tsx
│   ├── StoragePage.tsx
│   ├── SettingsPage.tsx
│   ├── AuditLogsPage.tsx
│   ├── NotificationsPage.tsx
│   └── ProfilePage.tsx
├── stores/
│   ├── authStore.ts       # Authentication state
│   └── brandingStore.ts   # Branding/theme state
├── App.tsx
├── main.tsx
└── index.css              # TailwindCSS + CSS variables
```

## License

Proprietary - EUSuite Platform
