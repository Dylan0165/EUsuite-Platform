# EUSuite Multi-Tenant Platform

## Overview

The EUSuite Multi-Tenant Platform allows businesses to deploy their own isolated EUSuite ecosystems. Each company (tenant) gets:

- **Isolated Namespace**: Kubernetes namespace `tenant-{company-slug}`
- **Dedicated Services**: Dashboard, Login, EUCloud, EUType, EUMail, EUGroups
- **Custom Branding**: Colors, logos, typography, login page customization
- **Storage Policies**: COMPANY_ONLY, EUSUITE_ONLY, or HYBRID storage
- **User Management**: Company-specific users with role-based access

## Deployment Options

### 1. Central Cloud (Default)
- Tenant deployed on your EUSuite VM
- Managed by EUSuite platform
- Automatic provisioning

### 2. Company Cloud
- Tenant deployed on company's own Kubernetes cluster
- YAML generated and applied remotely
- Requires kubeconfig from company

### 3. Self-Hosted
- Company downloads YAML files
- Manual deployment on their infrastructure
- Full control, no dependency on EUSuite

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     EUSuite Admin Portal                        │
│  ┌──────────┐ ┌────────────┐ ┌──────────┐ ┌────────────────┐   │
│  │Companies │ │   Users    │ │ Branding │ │   Deployments  │   │
│  └──────────┘ └────────────┘ └──────────┘ └────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│                      Backend Services                           │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────────┐  │
│  │ CompanyManager │ │  UserManager   │ │  BrandingEngine    │  │
│  └────────────────┘ └────────────────┘ └────────────────────┘  │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────────┐  │
│  │  PortManager   │ │ YAMLGenerator  │ │ DeploymentEngine   │  │
│  └────────────────┘ └────────────────┘ └────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                     Kubernetes Cluster                          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│  │   eucloud   │ │ tenant-acme │ │tenant-other │   ...         │
│  │ (central)   │ │             │ │             │               │
│  └─────────────┘ └─────────────┘ └─────────────┘               │
└─────────────────────────────────────────────────────────────────┘
```

## Database Schema

### Companies
- `id`, `name`, `slug`, `namespace`
- `contact_email`, `billing_email`
- `deployment_target` (central_cloud | company_cloud | self_hosted)
- `is_active`, `is_approved`, `is_suspended`

### Company Users
- `id`, `company_id`, `first_name`, `last_name`
- `email` (auto-generated: voornaam.achternaam@eumail.eu)
- `role` (superadmin | company_admin | user)
- `storage_quota`, `storage_used`

### Branding
- `company_id`
- `primary_color`, `secondary_color`, `accent_color`
- `logo_url`, `favicon_url`
- `custom_css`, `font_family`

### Storage Policy
- `company_id`
- `policy_type` (COMPANY_ONLY | EUSUITE_ONLY | HYBRID)
- `max_file_size_mb`
- `allowed_extensions`, `blocked_extensions`

### Port Allocations
- `port`, `company_id`, `service_type`
- `namespace`, `is_allocated`

### Deployments
- `deployment_id`, `company_id`
- `status` (pending | in_progress | completed | failed)
- `duration_seconds`

## API Endpoints

### Companies
```
GET    /api/companies           - List all companies
POST   /api/companies           - Create company
GET    /api/companies/{id}      - Get company details
PATCH  /api/companies/{id}      - Update company
DELETE /api/companies/{id}      - Delete company
POST   /api/companies/{id}/approve - Approve company
POST   /api/companies/{id}/suspend - Suspend company
```

### Company Users
```
GET    /api/companies/{id}/users           - List users
POST   /api/companies/{id}/users           - Create user
GET    /api/companies/{id}/users/{uid}     - Get user
PATCH  /api/companies/{id}/users/{uid}     - Update user
DELETE /api/companies/{id}/users/{uid}     - Delete user
POST   /api/companies/{id}/users/{uid}/reset-password
```

### Branding
```
GET  /api/companies/{id}/branding       - Get branding
PUT  /api/companies/{id}/branding       - Update branding
POST /api/companies/{id}/branding/reset - Reset to defaults
GET  /api/companies/{id}/branding.json  - Get as JSON (for apps)
```

### Storage Policy
```
GET  /api/companies/{id}/storage-policy       - Get policy
PUT  /api/companies/{id}/storage-policy       - Update policy
GET  /api/companies/{id}/storage-policy/stats - Get stats
```

### Deployments
```
POST   /api/companies/{id}/deploy        - Deploy company
GET    /api/companies/{id}/deployments   - Deployment history
GET    /api/deployments/{id}             - Get deployment
GET    /api/deployments/{id}/logs        - Get logs
GET    /api/deployments/{id}/yaml        - Get YAML
POST   /api/companies/{id}/rollback      - Rollback deployment
WS     /api/ws/deployments/{id}/logs     - Real-time logs
```

### Platform
```
GET /api/platform/stats  - Platform statistics
GET /api/platform/health - Platform health
```

## Port Allocation

NodePorts are allocated in the range **30100-30899**:
- Each company gets 8 ports (one per service)
- Allocation tracked in `port_allocations` table
- Released when company is deleted

## Kubernetes Resources

For each tenant, the following resources are created:

1. **Namespace**: `tenant-{slug}`
2. **Secrets**: Database credentials, API keys
3. **PVC**: Storage for tenant data
4. **ConfigMap**: Branding configuration
5. **Deployments**: All EUSuite services
6. **Services**: NodePort services for each app

## Getting Started

### 1. Deploy the Platform
```bash
kubectl apply -f k8s/euadmin/
```

### 2. Create a Company
```bash
curl -X POST http://admin.eusuite.local/api/companies \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acme Corp",
    "contact_email": "admin@acme.com",
    "deployment_target": "central_cloud"
  }'
```

### 3. Deploy the Tenant
```bash
curl -X POST http://admin.eusuite.local/api/companies/1/deploy
```

### 4. Access Tenant Services
- Dashboard: `http://192.168.124.50:30100`
- Login: `http://192.168.124.50:30101`
- EUCloud: `http://192.168.124.50:30102`
- etc.

## Environment Variables

### Backend
```
TENANT_DATABASE_URL=sqlite:////app/data/tenant.db
DOCKER_REGISTRY=dylan016504
NODEPORT_RANGE_START=30100
NODEPORT_RANGE_END=30899
```

### Frontend
```
VITE_API_BASE=http://192.168.124.50:30095/api
```

## Security Considerations

- Each tenant namespace is isolated
- Network policies can be added for inter-tenant isolation
- RBAC ensures tenants can only access their resources
- Storage encryption available per-tenant
- Audit logging for all operations

## Monitoring

The admin dashboard provides:
- Real-time deployment logs via WebSocket
- Resource usage per tenant
- Storage consumption
- User activity

## Roadmap

- [ ] Multi-cluster support
- [ ] Tenant billing integration
- [ ] Advanced network policies
- [ ] Backup/restore per tenant
- [ ] Custom domain support per tenant
