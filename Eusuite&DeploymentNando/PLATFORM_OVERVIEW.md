# 🚀 EUSuite Platform - Complete Multi-Tenant SaaS

## 📋 Overzicht

EUSuite is een complete Office 365 alternatief, gebouwd als multi-tenant SaaS platform met 3 tiers:

| Tier | Domein | Functie |
|------|--------|---------|
| **Public** | eusuite.eu | Marketing website, registratie, prijzen |
| **Company** | company.eusuite.eu | Bedrijfsbeheer, gebruikers, deployments |
| **Superadmin** | admin.eusuite.eu | Platform beheer, alle tenants |

---

## 🏗️ Architectuur

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         KUBERNETES CLUSTER                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ eusuite-platform namespace                                       │    │
│  │                                                                  │    │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────┐ │    │
│  │  │ Superadmin       │  │ Company          │  │ Shared         │ │    │
│  │  │ Backend :30300   │  │ Backend :30200   │  │ Services       │ │    │
│  │  │ Frontend :30301  │  │ Frontend :30201  │  │ PostgreSQL     │ │    │
│  │  └──────────────────┘  └──────────────────┘  │ Redis          │ │    │
│  │                                               └────────────────┘ │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ eusuite-public namespace                                         │    │
│  │                                                                  │    │
│  │  ┌──────────────────┐  ┌──────────────────┐                     │    │
│  │  │ Public           │  │ Public           │                     │    │
│  │  │ Backend :30100   │  │ Frontend :30101  │                     │    │
│  │  └──────────────────┘  └──────────────────┘                     │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ tenant-{company-slug} namespaces (dynamisch per tenant)          │    │
│  │                                                                  │    │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐        │    │
│  │  │ EUMail │ │EUCloud │ │ EUType │ │EUGroups│ │EUAdmin │        │    │
│  │  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘        │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structuur

```
Eusuite&DeploymentNando/
├── apps/
│   ├── eusuite-public-backend/     # FastAPI - Marketing API
│   ├── eusuite-public-frontend/    # React - Marketing Website
│   ├── eusuite-company-backend/    # FastAPI - Company Admin API
│   ├── eusuite-company-frontend/   # React - Company Portal
│   ├── eusuite-superadmin-backend/ # FastAPI - Platform Admin API
│   ├── eusuite-superadmin-frontend/# React - Superadmin Dashboard
│   └── shared/                     # Gedeelde configuratie
├── k8s/
│   ├── platform.yaml               # Alle K8s resources
│   └── tenant-template.yaml        # Template voor tenant namespaces
├── .github/workflows/
│   └── ci-cd.yml                   # GitHub Actions pipeline
└── README.md
```

---

## 🛠️ Tech Stack

### Backend
- **Framework**: FastAPI (async)
- **Database**: PostgreSQL + async SQLAlchemy 2.0
- **Authentication**: JWT + Argon2
- **Payments**: Stripe
- **Cache**: Redis
- **Container Orchestration**: Kubernetes API

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **State**: Zustand + React Query
- **Forms**: React Hook Form
- **Charts**: Recharts / Chart.js

### Infrastructure
- **Container**: Docker
- **Orchestration**: Kubernetes (K3s compatible)
- **CI/CD**: GitHub Actions
- **Registry**: GHCR / DockerHub

---

## 🐳 Docker Images

Alle EUSuite apps zijn beschikbaar via Dylan's DockerHub:

| App | Image | Port |
|-----|-------|------|
| Login | `dylan016504/eusuite-login:latest` | 80 |
| Dashboard | `dylan016504/eusuite-dashboard:latest` | 80 |
| EUMail Frontend | `dylan016504/eumail-frontend:latest` | 80 |
| EUMail Backend | `dylan016504/eumail-backend:latest` | 3000 |
| EUCloud Frontend | `dylan016504/eucloud-frontend:latest` | 80 |
| EUCloud Backend | `dylan016504/eucloud-backend:latest` | 3000 |
| EUType Frontend | `dylan016504/eutype-frontend:latest` | 80 |
| EUGroups Frontend | `dylan016504/eugroups-frontend:latest` | 80 |
| EUGroups Backend | `dylan016504/eugroups-backend:latest` | 3000 |
| EUGroups Media | `dylan016504/eugroups-media-server:latest` | 3000 |
| EUAdmin Frontend | `dylan016504/euadmin-frontend:latest` | 80 |
| EUAdmin Backend | `dylan016504/euadmin-backend:latest` | 3000 |

---

## 🚀 Deployment

### 1. Prerequisites
```bash
# Kubernetes cluster (K3s aanbevolen)
curl -sfL https://get.k3s.io | sh -

# kubectl configureren
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
```

### 2. Deploy Platform
```bash
# Namespace en basis resources
kubectl apply -f k8s/platform.yaml

# Secrets aanmaken (pas aan voor productie!)
kubectl create secret generic eusuite-secrets \
  --namespace eusuite-platform \
  --from-literal=database-url="postgresql://..." \
  --from-literal=jwt-secret="your-secret" \
  --from-literal=stripe-secret-key="sk_..." \
  --from-literal=redis-url="redis://redis:6379"
```

### 3. Toegang
| Service | URL |
|---------|-----|
| Public Frontend | http://NODE_IP:30101 |
| Public API | http://NODE_IP:30100 |
| Company Frontend | http://NODE_IP:30201 |
| Company API | http://NODE_IP:30200 |
| Superadmin Frontend | http://NODE_IP:30301 |
| Superadmin API | http://NODE_IP:30300 |

---

## 📡 API Endpoints

### Public API (eusuite.eu)
```
POST /api/auth/register     # Gebruiker registratie
POST /api/auth/login        # Login
GET  /api/plans             # Beschikbare abonnementen
POST /api/companies/register # Bedrijf aanmelden
POST /api/contact           # Contactformulier
POST /api/webhooks/stripe   # Stripe webhook
```

### Company API (company.eusuite.eu)
```
GET  /api/dashboard/stats   # Dashboard statistieken
CRUD /api/users             # Gebruikersbeheer
CRUD /api/departments       # Afdelingen
GET  /api/deployments       # App deployments
POST /api/deployments/{app}/toggle  # App aan/uit
GET  /api/audit-logs        # Audit trail
PUT  /api/branding          # Bedrijfsbranding
```

### Superadmin API (admin.eusuite.eu)
```
GET  /api/dashboard/stats   # Platform statistieken
CRUD /api/tenants           # Bedrijven beheer
CRUD /api/plans             # Abonnementen beheer
GET  /api/kubernetes/stats  # K8s platform stats
POST /api/kubernetes/eusuite/deploy  # Deploy EUSuite apps
GET  /api/kubernetes/namespaces/{ns}/monitoring  # Namespace monitoring
```

---

## 🔐 Authenticatie Flow

```
┌─────────┐     ┌─────────────┐     ┌─────────────┐
│  User   │────▶│ Public Site │────▶│   Register  │
└─────────┘     └─────────────┘     │  + Company  │
                                     └──────┬──────┘
                                            │
                                            ▼
┌─────────────────────────────────────────────────────┐
│              Company Portal Login                    │
│  ┌────────────────────────────────────────────────┐ │
│  │ 1. User logt in op company.eusuite.eu          │ │
│  │ 2. JWT token ontvangen                         │ │
│  │ 3. Redirect naar dashboard                     │ │
│  └────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│              Company Dashboard                       │
│  - Gebruikers beheren                               │
│  - Apps deployen (EUMail, EUCloud, etc.)            │
│  - Branding instellen                               │
│  - Statistieken bekijken                            │
└─────────────────────────────────────────────────────┘
```

---

## 📊 Monitoring & Metrics

De superadmin backend heeft directe Kubernetes integratie voor:

- **Pod status** - Running, Pending, Failed
- **Resource metrics** - CPU, Memory per pod
- **Storage quota** - PVC usage per tenant
- **Auto-scaling** - HPA status
- **Logs** - Real-time pod logs

---

## 💰 Pricing Tiers

| Plan | Prijs/maand | Gebruikers | Storage | Apps |
|------|-------------|------------|---------|------|
| **Free** | €0 | 3 | 5GB | 2 |
| **Starter** | €29 | 10 | 50GB | Alle |
| **Professional** | €79 | 50 | 200GB | Alle + analytics |
| **Enterprise** | €199 | Unlimited | 1TB | Alle + SSO + SLA |

---

## 🔄 CI/CD Pipeline

De GitHub Actions pipeline:

1. **Detect Changes** - Alleen gewijzigde apps builden
2. **Build & Test** - Python/Node.js tests
3. **Docker Build** - Multi-stage builds
4. **Push to Registry** - GHCR
5. **Deploy to Staging** - Automatic
6. **Deploy to Production** - Manual approval

---

## 📞 Contact

- **GitHub**: [Dylan0165/EUsuite-Platform](https://github.com/Dylan0165/EUsuite-Platform)
- **DockerHub**: [dylan016504](https://hub.docker.com/u/dylan016504)
