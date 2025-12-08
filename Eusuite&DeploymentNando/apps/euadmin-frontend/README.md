# EUSuite Admin Dashboard

A comprehensive monitoring and control dashboard for managing the EUSuite platform.

## Features

- **Dashboard Overview** - Real-time statistics, CPU/memory charts, pod status
- **User Management** - View, search, block, delete users, reset storage
- **Storage Monitoring** - Per-user storage usage, total storage stats
- **System Monitoring** - Kubernetes metrics, pod resources, deployment management
- **Activity Logs** - View pod logs, filter and search log output

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Admin Dashboard                           │
├─────────────────────────────────────────────────────────────────┤
│  Frontend (React + Vite + Tailwind)                             │
│  Port: 30090                                                     │
├─────────────────────────────────────────────────────────────────┤
│  Backend (FastAPI)                                               │
│  Port: 30091                                                     │
├─────────────────────────────────────────────────────────────────┤
│  PostgreSQL (shared with EUCloud)                               │
│  Kubernetes API                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start

### Local Development

**Backend:**
```bash
cd apps/euadmin-backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

**Frontend:**
```bash
cd apps/euadmin-frontend
npm install
npm run dev
```

### Access
- Frontend: http://localhost:5180
- Backend API: http://localhost:8001/api

### Default Credentials
- Email: `admin@eusuite.nl`
- Password: `admin123`

> ⚠️ **Change these in production!**

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Admin login |
| GET | `/api/auth/validate` | Validate token |
| POST | `/api/auth/logout` | Logout |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List all users |
| GET | `/api/users/{id}` | Get user details |
| DELETE | `/api/users/{id}` | Delete user |
| POST | `/api/users/{id}/block` | Block/unblock user |
| POST | `/api/users/{id}/reset-storage` | Reset user storage |
| GET | `/api/users/storage` | Get storage stats per user |

### System
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/system/stats` | System statistics |
| GET | `/api/system/pods` | List all pods |
| GET | `/api/system/usage` | CPU/memory metrics |
| GET | `/api/system/deployments` | List deployments |
| POST | `/api/system/deployments/{name}/restart` | Restart deployment |
| GET | `/api/system/logs/{pod}` | Get pod logs |

## Kubernetes Deployment

### Prerequisites
- Kubernetes cluster with metrics-server installed
- `eucloud-secrets` secret with `database-url` and `jwt-secret-key`

### Deploy

```bash
# Apply secrets
kubectl apply -f k8s/euadmin/euadmin-secrets.yaml -n eusuite

# Deploy backend
kubectl apply -f k8s/euadmin/euadmin-backend-deployment.yaml -n eusuite

# Deploy frontend
kubectl apply -f k8s/euadmin/euadmin-frontend-deployment.yaml -n eusuite
```

### Access After Deployment
- Frontend: `http://<node-ip>:30090`
- Backend: `http://<node-ip>:30091/api`

## Security

### RBAC
The backend needs Kubernetes RBAC permissions to access cluster metrics:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: euadmin-metrics-reader
rules:
  - apiGroups: [""]
    resources: ["pods", "pods/log", "namespaces"]
    verbs: ["get", "list"]
  - apiGroups: ["apps"]
    resources: ["deployments"]
    verbs: ["get", "list", "patch"]
  - apiGroups: ["metrics.k8s.io"]
    resources: ["pods"]
    verbs: ["get", "list"]
```

### Changing Admin Password

Generate a new bcrypt hash:
```python
from passlib.hash import bcrypt
print(bcrypt.hash('YOUR_NEW_PASSWORD'))
```

Update in `k8s/euadmin/euadmin-secrets.yaml` and reapply:
```bash
kubectl apply -f k8s/euadmin/euadmin-secrets.yaml -n eusuite
kubectl rollout restart deployment/euadmin-backend -n eusuite
```

## Environment Variables

### Backend
| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | - |
| `JWT_SECRET_KEY` | JWT signing key | - |
| `ADMIN_EMAIL` | Admin login email | `admin@eusuite.nl` |
| `ADMIN_PASSWORD_HASH` | Bcrypt password hash | - |
| `KUBERNETES_NAMESPACE` | K8s namespace to monitor | `eusuite` |

### Frontend
| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `/api` |

## Pages

### Dashboard (`/`)
- Total users, files, storage stats
- CPU/memory usage charts
- Pod status overview

### Users (`/users`)
- Searchable user table
- User details modal
- Actions: View, Block, Delete, Reset Storage

### Storage (`/storage`)
- Storage distribution chart
- Per-user storage usage table
- Total storage metrics

### System (`/system`)
- Kubernetes pod metrics
- Deployment management
- Resource usage charts

### Activity (`/activity`)
- Pod log viewer
- Log filtering and search
- Raw log output

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Submit pull request

## License

Internal use only - EUSuite Platform
