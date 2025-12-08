# 🔄 EuType Migration naar EU-CORE-BACKEND

## Repository Structuur

```
eutype-frontend/
├── .github/
│   └── workflows/
│       └── deploy.yaml          # CI/CD pipeline
├── k8s/
│   ├── deployment.yaml          # Kubernetes Deployment
│   └── service.yaml             # Kubernetes Service (NodePort 30081)
├── src/
│   ├── api/
│   │   ├── client.js           # API client met axios
│   │   ├── auth.js             # Auth endpoints
│   │   └── files.js            # File endpoints
│   ├── components/
│   │   ├── RibbonToolbar.jsx   # Bestaande ribbon
│   │   ├── Editor.jsx          # TipTap editor
│   │   ├── StatusBar.jsx       # Status bar
│   │   ├── LoginForm.jsx       # NEW: Login component
│   │   └── FilePicker.jsx      # NEW: File selector
│   ├── pages/
│   │   ├── LoginPage.jsx       # Login pagina
│   │   ├── EditorPage.jsx      # Editor met backend sync
│   │   └── Dashboard.jsx       # File browser
│   ├── utils/
│   │   ├── auth.js             # JWT token management
│   │   └── storage.js          # localStorage helpers
│   ├── App.jsx                 # Routes + Auth guard
│   ├── main.jsx                # Entry point
│   └── index.css               # Global styles
├── public/
│   ├── logo.svg
│   └── download.html
├── nginx/
│   └── default.conf            # Nginx config
├── .env.development            # Dev API URL
├── .env.production             # Prod API URL
├── Dockerfile                  # Production build
├── docker-compose.yml          # Local testing
├── package.json
├── vite.config.js
└── README.md
```

## Deployment Flow

1. **Push naar GitHub** → `main` branch
2. **GitHub Actions** triggert (self-hosted runner)
3. **Docker Build** → Image naar GHCR
4. **kubectl apply** → Deploy naar k3s
5. **NodePort 30081** → Live!

## API Integration

- Base URL: `http://192.168.124.50:30500/api`
- Auth: JWT Bearer tokens (24h expiry)
- Storage: User-specific via backend
- Files: `.ty` format (JSON)
