# EUSuite Superadmin Backend

Superadmin portal API for managing the entire EUSuite multi-tenant platform.

## Features

- **Admin Management**: CRUD for superadmin users with role-based access
- **Tenant Management**: Create, activate, suspend, terminate tenants
- **Plan Management**: Subscription plans with Stripe integration
- **Deployment Management**: Kubernetes namespace and app deployment orchestration
- **Invoice Management**: Billing and invoice generation
- **Support Tickets**: Customer support ticket system
- **Audit Logs**: Complete audit trail of all admin actions
- **Dashboard**: Platform-wide statistics and metrics
- **System Settings**: Global configuration management

## Tech Stack

- **FastAPI** - Modern Python web framework
- **SQLAlchemy** - Async ORM with PostgreSQL
- **Pydantic** - Data validation
- **Argon2** - Password hashing
- **JWT** - Authentication tokens
- **Stripe** - Payment processing
- **Kubernetes Python Client** - K8s management
- **Redis** - Port allocation and caching

## API Endpoints

### Authentication
- `POST /api/auth/login` - Admin login
- `POST /api/auth/refresh` - Refresh token
- `GET /api/auth/me` - Get current admin
- `PATCH /api/auth/me` - Update profile
- `POST /api/auth/logout` - Logout

### Admin Users
- `GET /api/admins` - List admins
- `POST /api/admins` - Create admin
- `GET /api/admins/{id}` - Get admin
- `PATCH /api/admins/{id}` - Update admin
- `DELETE /api/admins/{id}` - Delete admin

### Plans
- `GET /api/plans` - List plans
- `POST /api/plans` - Create plan
- `GET /api/plans/{id}` - Get plan
- `PATCH /api/plans/{id}` - Update plan
- `DELETE /api/plans/{id}` - Delete plan

### Tenants
- `GET /api/tenants` - List tenants
- `POST /api/tenants` - Create tenant
- `GET /api/tenants/{id}` - Get tenant details
- `PATCH /api/tenants/{id}` - Update tenant
- `POST /api/tenants/{id}/activate` - Activate tenant
- `POST /api/tenants/{id}/suspend` - Suspend tenant
- `DELETE /api/tenants/{id}` - Delete tenant

### Deployments
- `GET /api/deployments` - List deployments
- `POST /api/deployments` - Create deployment
- `GET /api/deployments/{id}` - Get deployment
- `GET /api/deployments/{id}/status` - Get K8s status
- `PATCH /api/deployments/{id}` - Update deployment
- `POST /api/deployments/{id}/scale` - Scale deployment
- `DELETE /api/deployments/{id}` - Delete deployment

### Invoices
- `GET /api/invoices` - List invoices
- `POST /api/invoices` - Create invoice
- `GET /api/invoices/{id}` - Get invoice
- `PATCH /api/invoices/{id}` - Update invoice
- `POST /api/invoices/{id}/send` - Send invoice
- `POST /api/invoices/{id}/mark-paid` - Mark as paid
- `DELETE /api/invoices/{id}` - Delete draft invoice

### Support Tickets
- `GET /api/tickets` - List tickets
- `POST /api/tickets` - Create ticket
- `GET /api/tickets/{id}` - Get ticket with messages
- `PATCH /api/tickets/{id}` - Update ticket
- `POST /api/tickets/{id}/messages` - Add message
- `POST /api/tickets/{id}/assign` - Assign ticket
- `POST /api/tickets/{id}/close` - Close ticket

### Dashboard
- `GET /api/dashboard/stats` - Dashboard statistics
- `GET /api/dashboard/revenue-by-month` - Revenue chart data
- `GET /api/dashboard/tenant-growth` - Growth chart data
- `GET /api/dashboard/subscription-breakdown` - Subscription stats
- `GET /api/dashboard/deployment-stats` - Deployment stats
- `GET /api/dashboard/recent-activity` - Recent audit logs

### Audit Logs
- `GET /api/audit` - List audit logs
- `GET /api/audit/actions` - List action types
- `GET /api/audit/resource-types` - List resource types
- `GET /api/audit/stats` - Audit statistics

### System Settings
- `GET /api/settings` - List settings
- `POST /api/settings` - Create setting
- `GET /api/settings/{key}` - Get setting
- `PATCH /api/settings/{key}` - Update setting
- `DELETE /api/settings/{key}` - Delete setting
- `GET /api/public/settings` - Public settings (no auth)

## Development

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
.\venv\Scripts\activate   # Windows

# Install dependencies
pip install -r requirements.txt

# Run development server
uvicorn app.main:app --reload --port 8000
```

## Environment Variables

Create a `.env` file:

```env
# Database
DATABASE_URL=postgresql+asyncpg://eusuite:eusuite@localhost:5432/eusuite_superadmin

# Redis
REDIS_URL=redis://localhost:6379/2

# JWT
JWT_SECRET_KEY=your-super-secret-key-change-in-production

# Superadmin
SUPERADMIN_EMAIL=admin@eusuite.eu
SUPERADMIN_PASSWORD=SecurePassword123!

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Kubernetes
K8S_IN_CLUSTER=false
K8S_CONFIG_PATH=~/.kube/config

# CORS
CORS_ORIGINS=["http://localhost:3000","https://admin.eusuite.eu"]
```

## Docker

```bash
# Build image
docker build -t eusuite-superadmin-backend .

# Run container
docker run -p 8000:8000 --env-file .env eusuite-superadmin-backend
```

## Admin Roles

- **superadmin**: Full access to all features
- **admin**: Can manage tenants, deployments, invoices
- **support**: Can manage support tickets, view data
- **viewer**: Read-only access

## License

Proprietary - EUSuite Platform
