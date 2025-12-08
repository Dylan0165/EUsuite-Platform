# EUAdmin Backend API

FastAPI backend for the EUSuite Admin Dashboard providing user management, system monitoring, and Kubernetes integration.

## Features

- JWT-based admin authentication
- User CRUD operations
- Storage statistics
- Kubernetes metrics integration
- Pod log retrieval
- Deployment management

## Requirements

- Python 3.11+
- PostgreSQL database
- Kubernetes cluster (optional, for metrics)

## Installation

```bash
cd apps/euadmin-backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate  # Windows

pip install -r requirements.txt
```

## Configuration

Set environment variables:

```bash
export DATABASE_URL="postgresql://user:pass@localhost:5432/eucloud"
export JWT_SECRET_KEY="your-secret-key"
export ADMIN_EMAIL="admin@eusuite.nl"
export ADMIN_PASSWORD_HASH="$2b$12$..."  # bcrypt hash
export KUBERNETES_NAMESPACE="eusuite"
```

## Running

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

## API Documentation

Once running, access:
- Swagger UI: http://localhost:8001/docs
- ReDoc: http://localhost:8001/redoc

## Project Structure

```
app/
├── __init__.py
├── main.py           # FastAPI app setup
├── config.py         # Settings management
├── auth.py           # JWT authentication
├── database.py       # Database queries
├── kubernetes_client.py  # K8s API client
├── schemas.py        # Pydantic models
└── routers/
    ├── __init__.py
    ├── auth.py       # Auth endpoints
    ├── users.py      # User management
    └── system.py     # System monitoring
```

## Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `GET /api/auth/validate` - Validate token
- `POST /api/auth/logout` - Logout

### Users
- `GET /api/users` - List users
- `GET /api/users/{id}` - Get user
- `DELETE /api/users/{id}` - Delete user
- `POST /api/users/{id}/block` - Toggle block
- `POST /api/users/{id}/reset-storage` - Reset storage
- `GET /api/users/storage` - Storage stats

### System
- `GET /api/system/stats` - Overall stats
- `GET /api/system/pods` - List pods
- `GET /api/system/usage` - Resource usage
- `GET /api/system/deployments` - List deployments
- `POST /api/system/deployments/{name}/restart` - Restart
- `GET /api/system/logs/{pod}` - Get logs

## Docker

Build:
```bash
docker build -t euadmin-backend .
```

Run:
```bash
docker run -p 8001:8000 \
  -e DATABASE_URL="..." \
  -e JWT_SECRET_KEY="..." \
  euadmin-backend
```

## Testing

```bash
pytest
```

## License

Internal use only - EUSuite Platform
