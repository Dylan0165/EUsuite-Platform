# EUSuite Website Backend

Backend API voor de publieke EUSuite website. Handelt registratie en contactformulieren af.

## 🎯 Functionaliteit

- **Registratie**: Bedrijven kunnen zich registreren via een multi-step wizard
- **E-mail Verificatie**: Verificatie e-mails met tokens
- **Tenant Provisioning**: Automatisch aanmaken van tenant in admin backend
- **Contact Formulier**: Opslaan en verwerken van contactaanvragen

## 🔌 API Endpoints

### Registratie

```
POST /api/v1/public/register
```
Registreer een nieuw bedrijf en admin account.

**Request:**
```json
{
  "company": {
    "name": "Bedrijf BV",
    "slug": "bedrijf-bv",
    "industry": "tech",
    "employee_count": "11-50",
    "plan": "business"
  },
  "admin": {
    "first_name": "Jan",
    "last_name": "Jansen",
    "email": "jan@bedrijf.nl",
    "password": "secret123"
  },
  "agree_marketing": false
}
```

```
GET /api/v1/public/verify?token=xxx
```
Verifieer e-mailadres en start tenant provisioning.

```
GET /api/v1/public/registration/status?email=xxx
```
Check registratie status.

### Validatie

```
POST /api/v1/public/check-slug
```
Check of een bedrijfsslug beschikbaar is.

```
POST /api/v1/public/check-email
```
Check of een e-mailadres beschikbaar is.

### Contact

```
POST /api/v1/public/contact
```
Verstuur een contactformulier.

## 🏗️ Architectuur

```
┌─────────────────────────────────────────────────────────────────┐
│  Frontend (eusuite-website)                                     │
│  - Marketing pages                                               │
│  - Registration wizard                                           │
│  - Contact form                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Backend (eusuite-website-backend) ← Deze app                   │
│  - Registration API                                              │
│  - Email verification                                            │
│  - Contact messages                                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Admin Backend (euadmin-backend)                                │
│  - Tenant/Company creation                                       │
│  - User management                                               │
│  - Kubernetes deployment                                         │
└─────────────────────────────────────────────────────────────────┘
```

## 📁 Project Structuur

```
eusuite-website-backend/
├── app/
│   ├── __init__.py
│   ├── config.py          # Settings & environment
│   ├── database.py        # SQLAlchemy setup
│   ├── models.py          # Database models
│   ├── schemas.py         # Pydantic schemas
│   ├── services.py        # Business logic
│   ├── email.py           # Email templates & sending
│   └── routes/
│       ├── __init__.py
│       └── public.py      # Public API endpoints
├── main.py                # FastAPI app
├── requirements.txt       # Dependencies
├── Dockerfile             # Container build
└── README.md              # This file
```

## 🚀 Development

```bash
# Virtual environment
python -m venv venv
source venv/bin/activate  # of: venv\Scripts\activate

# Dependencies installeren
pip install -r requirements.txt

# Development server starten
uvicorn main:app --reload --port 8000

# Met debug mode
DEBUG=true uvicorn main:app --reload
```

## 🐳 Docker

```bash
# Image bouwen
docker build -t eusuite-website-backend .

# Container starten
docker run -p 8000:8000 \
  -e DATABASE_URL=sqlite:///./data/eusuite.db \
  -e ADMIN_BACKEND_URL=http://euadmin-backend:8000 \
  eusuite-website-backend
```

## ⚙️ Configuratie

| Variabele | Beschrijving | Default |
|-----------|--------------|---------|
| `DATABASE_URL` | Database connection string | `sqlite:///./eusuite_public.db` |
| `SECRET_KEY` | JWT secret key | - |
| `DEBUG` | Enable debug mode | `false` |
| `SMTP_HOST` | SMTP server | `localhost` |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_USER` | SMTP username | - |
| `SMTP_PASSWORD` | SMTP password | - |
| `SMTP_FROM` | From address | `noreply@eusuite.eu` |
| `ADMIN_BACKEND_URL` | URL of admin backend | `http://euadmin-backend:8000` |
| `ADMIN_API_KEY` | API key for admin backend | - |
| `COMPANY_PORTAL_URL` | URL of company portal | `https://portal.eusuite.eu` |

## 📧 E-mail Templates

De app bevat HTML e-mail templates voor:

1. **Verificatie E-mail**: Verstuurd na registratie met verificatie link
2. **Welkom E-mail**: Verstuurd na succesvolle tenant provisioning

In development mode worden e-mails gelogd naar console in plaats van verstuurd.
