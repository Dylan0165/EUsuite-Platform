# EUsuite Dashboard# EUsuite Dashboard# React + TypeScript + Vite



React + TypeScript + Vite application with **complete SSO integration** ✅



> **Status:** Production Ready - Auto-redirect naar login portal wanneer geen geldige cookie aanwezig isEen moderne, centrale dashboard applicatie voor de EUsuite van applicaties. Het dashboard biedt toegang tot EUCloud, EUType, Profile en Settings via een clean en gebruiksvriendelijke interface.This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.



---



## 🎯 Overzicht## 🚀 FeaturesCurrently, two official plugins are available:



Een moderne, centrale dashboard applicatie voor de EUsuite van applicaties. Het dashboard biedt toegang tot EUCloud, EUType, Profile en Settings via een clean en gebruiksvriendelijke interface.



## 🚀 Features- **SSO Integratie**: Volledig geïntegreerd met het centrale SSO-systeem- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh



- ✅ **Volledige SSO Integratie**: Automatische redirect naar login portal bij ontbrekende cookie- **Moderne UI**: Clean, responsive interface met Tailwind CSS- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

- ✅ **Moderne UI**: Clean, responsive interface met Tailwind CSS

- ✅ **React Router**: Client-side routing voor snelle navigatie- **React Router**: Client-side routing voor snelle navigatie

- ✅ **TypeScript**: Type-safe code voor betere ontwikkelervaring

- ✅ **Kubernetes Ready**: Volledige deployment configuratie met CI/CD- **TypeScript**: Type-safe code voor betere ontwikkelervaring## React Compiler

- ✅ **Loading States**: Smooth UX met loading spinners

- ✅ **Error Handling**: Robuuste error handling en fallbacks- **Kubernetes Ready**: Volledige deployment configuratie



## 🔐 SSO ConfiguratieThe React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).



Het dashboard maakt gebruik van het centrale SSO-systeem:## 🔐 SSO Configuratie



| Component | URL/Value |## Expanding the ESLint configuration

|-----------|-----------|

| **SSO Backend** | `http://192.168.124.50:30500` |Het dashboard maakt gebruik van het centrale SSO-systeem:

| **Login Portal** | `http://192.168.124.50:30090/login` |

| **Dashboard URL** | `http://192.168.124.50:30091` |If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

| **Cookie naam** | `eusuite_token` |

| **Cookie domein** | `192.168.124.50` |- **SSO Backend**: `http://192.168.124.50:30500`



### SSO Endpoints- **Login Portal**: `http://192.168.124.50:30090/login````js



- `GET /api/auth/validate` - Valideer authenticatie token (credentials: "include")- **Dashboard URL**: `http://192.168.124.50:30091`export default defineConfig([

- `POST /api/auth/logout` - Uitloggen en cookie verwijderen

- **Cookie naam**: `eusuite_token`  globalIgnores(['dist']),

### SSO Flow

- **Cookie domein**: `192.168.124.50`  {

1. User bezoekt dashboard zonder cookie

2. Dashboard checkt `/api/auth/validate` met credentials    files: ['**/*.{ts,tsx}'],

3. Bij ontbrekende/ongeldige cookie: redirect naar login

4. Login portal stelt cookie in na succesvolle authenticatie### Endpoints    extends: [

5. Redirect terug naar dashboard met geldige cookie

6. Dashboard valideert cookie en toont content      // Other configs...



📖 **Meer details**: Zie `SSO-IMPLEMENTATION.md` en `SSO-FLOW-VISUAL.md`- `GET /api/auth/validate` - Valideer authenticatie token



## 📦 Project Structuur- `POST /api/auth/logout` - Uitloggen en cookie verwijderen      // Remove tseslint.configs.recommended and replace with this



```      tseslint.configs.recommendedTypeChecked,

src/

├── components/           # Herbruikbare UI componenten## 📦 Project Structuur      // Alternatively, use this for stricter rules

│   ├── Header.tsx       # Header met username en logout button

│   ├── Layout.tsx       # Root layout met auth check      tseslint.configs.strictTypeChecked,

│   ├── DashboardCard.tsx # Herbruikbare app card component

│   └── LoadingSpinner.tsx # Loading state component```      // Optionally, add this for stylistic rules

├── pages/               # Route pagina's

│   ├── Dashboard.tsx    # Hoofd dashboard met app cardssrc/      tseslint.configs.stylisticTypeChecked,

│   ├── Profile.tsx      # User profile pagina

│   └── Settings.tsx     # Settings pagina├── components/        # Herbruikbare UI componenten

├── hooks/               # Custom React hooks

│   └── useAuth.ts       # SSO authenticatie hook│   ├── Header.tsx      // Other configs...

├── types/               # TypeScript type definities

│   └── auth.ts          # Auth-gerelateerde types│   ├── Layout.tsx    ],

├── config/              # Configuratie bestanden

│   └── constants.ts     # API URLs en constanten│   ├── DashboardCard.tsx    languageOptions: {

└── main.tsx             # Application entry point met Router

│   └── LoadingSpinner.tsx      parserOptions: {

k8s/                     # Kubernetes configuratie

├── deployment.yaml      # K8s deployment manifest├── pages/            # Route pagina's        project: ['./tsconfig.node.json', './tsconfig.app.json'],

└── docker-secret-template.yaml  # Docker Hub secret template

│   ├── Dashboard.tsx        tsconfigRootDir: import.meta.dirname,

.github/

└── workflows/│   ├── Profile.tsx      },

    └── ci.yml           # GitHub Actions CI/CD pipeline

```│   └── Settings.tsx      // other options...



## 🛠️ Development├── hooks/            # Custom React hooks    },



### Vereisten│   └── useAuth.ts  },



- Node.js 20 of hoger├── types/            # TypeScript type definities])

- npm of yarn

│   └── auth.ts```

### Installatie

├── config/           # Configuratie bestanden

```bash

npm install│   └── constants.tsYou can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```

└── main.tsx          # Application entry point

### Development Server

``````js

```bash

npm run dev// eslint.config.js

```

## 🛠️ Developmentimport reactX from 'eslint-plugin-react-x'

De applicatie draait op `http://localhost:5173`

import reactDom from 'eslint-plugin-react-dom'

### Build

### Vereisten

```bash

npm run buildexport default defineConfig([

```

- Node.js 20 of hoger  globalIgnores(['dist']),

### Preview Production Build

- npm of yarn  {

```bash

npm run preview    files: ['**/*.{ts,tsx}'],

```

### Installatie    extends: [

## 🐳 Docker

      // Other configs...

### Lokaal Docker Image Bouwen

```bash      // Enable lint rules for React

```bash

docker build -t dylan016504/eusuite-dashboard:latest .npm install      reactX.configs['recommended-typescript'],

```

```      // Enable lint rules for React DOM

### Docker Image Testen

      reactDom.configs.recommended,

```bash

docker run -p 8080:80 dylan016504/eusuite-dashboard:latest### Development Server    ],

```

    languageOptions: {

Open `http://localhost:8080` om de app te testen.

```bash      parserOptions: {

### Docker Image Pushen (handmatig)

npm run dev        project: ['./tsconfig.node.json', './tsconfig.app.json'],

```bash

docker push dylan016504/eusuite-dashboard:latest```        tsconfigRootDir: import.meta.dirname,

```

      },

> **Note**: CI/CD pipeline handelt dit automatisch af bij push naar `main` branch.

De applicatie draait op `http://localhost:5173`      // other options...

## ☸️ Kubernetes Deployment

    },

### Automatische Deployment via CI/CD ✅

### Build  },

Bij elke push naar `main` branch:

])

1. **Build & Push**: GitHub Actions bouwt Docker image en pusht naar Docker Hub

2. **Deploy**: Self-hosted runner update Kubernetes deployment```bash```

3. **Verify**: Pipeline checkt of deployment succesvol is

npm run build

### Handmatige Deployment```



```bash## 🐳 Docker Build & Deploy

# Deploy naar K3s cluster

kubectl apply -f k8s/deployment.yaml### Docker Image Bouwen



# Verifieer deployment```bash

kubectl get pods -n eucloud -l app=eusuite-dashboarddocker build -t your-registry/eusuite-dashboard:latest .

```

# Check service

kubectl get svc -n eucloud eusuite-dashboard### Docker Image Pushen (voor CI/CD)



# Bekijk logs```bash

kubectl logs -n eucloud -l app=eusuite-dashboard --tail=50docker push your-registry/eusuite-dashboard:latest

``````



### Toegang tot Dashboard## ☸️ Kubernetes Deployment



Na deployment is het dashboard beschikbaar op:### Deploy naar K3s



``````bash

http://192.168.124.50:30091kubectl apply -f k8s/deployment.yaml

``````



### Deployment Updates### Verifieer Deployment



```bash```bash

# Force pod restart na image update# Check pods

kubectl rollout restart deployment/eusuite-dashboard -n eucloudkubectl get pods -l app=eusuite-dashboard



# Watch rollout status# Check service

kubectl rollout status deployment/eusuite-dashboard -n eucloudkubectl get svc eusuite-dashboard

```

# Check logs

## 🔄 CI/CD Workflowkubectl logs -l app=eusuite-dashboard

```

### GitHub Actions Pipeline

### Toegang tot Dashboard

Het project gebruikt GitHub Actions voor automatische deployment:

Na deployment is het dashboard beschikbaar op:

**Workflow**: `.github/workflows/ci.yml`- **URL**: `http://192.168.124.50:30091`



**Jobs**:## 🔄 CI/CD Workflow

1. **build-and-push** (ubuntu-latest)

   - Checkout code### Git Push naar CI/CD

   - Docker login met secrets

   - Build image1. **Commit wijzigingen**:

   - Push naar `dylan016504/eusuite-dashboard:latest` en `:sha-<commit>````bash

git add .

2. **deploy** (self-hosted runner)git commit -m "Update dashboard"

   - Configure kubectlgit push origin main

   - Create/update Docker Hub secret```

   - Force pod restart (fix ImagePullBackOff)

   - Apply/update deployment2. **CI/CD Pipeline** (automatisch):

   - Wait for rollout   - Build Docker image

   - Verify deployment   - Push naar registry

   - Update Kubernetes deployment

### Git Workflow

### Update Deployment.yaml

```bash

# 1. Maak wijzigingenPas de image tag aan in `k8s/deployment.yaml`:

vim src/pages/Dashboard.tsx

```yaml

# 2. Commit en pushimage: your-registry/eusuite-dashboard:v1.0.0

git add .```

git commit -m "Update dashboard layout"

git push origin main## 🎨 Applicatie Links



# 3. CI/CD pipeline start automatisch- **EUCloud**: `http://192.168.124.50:30080`

# Check: https://github.com/Dylan0165/DashAppEUSUITE/actions- **EUType**: `http://192.168.124.50:30081`

- **Profile**: `/profile` (intern)

# 4. Na ~2-3 minuten is update live op:- **Settings**: `/settings` (intern)

# http://192.168.124.50:30091

```## 🔧 Configuratie Aanpassen



### GitHub Secrets Configuratie### API Endpoints



Vereiste secrets in repository settings:Pas de URLs aan in `src/config/constants.ts`:



| Secret | Beschrijving |```typescript

|--------|--------------|export const API_BASE_URL = 'http://192.168.124.50:30500';

| `DOCKER_USERNAME` | Docker Hub username (dylan016504) |export const LOGIN_URL = 'http://192.168.124.50:30090/login';

| `DOCKER_PASSWORD` | Docker Hub access token |export const EUCLOUD_URL = 'http://192.168.124.50:30080';

| `KUBE_CONFIG` | Kubernetes config voor kubectl |export const EUTYPE_URL = 'http://192.168.124.50:30081';

```

📖 **Setup guide**: Zie `GITHUB-SECRETS-SETUP.md`

### NodePort

## 🎨 Applicatie Links

Om de NodePort te wijzigen, pas `k8s/deployment.yaml` aan:

Het dashboard biedt toegang tot:

```yaml

| Applicatie | URL | Beschrijving |nodePort: 30091  # Wijzig naar gewenste poort

|------------|-----|--------------|```

| **EUCloud** | `http://192.168.124.50:30080` | Cloud storage service |

| **EUType** | `http://192.168.124.50:30081` | Typing application |## 📝 Licentie

| **Profile** | `/profile` (intern) | User profile pagina |

| **Settings** | `/settings` (intern) | Applicatie instellingen |Proprietary - EUsuite Project



## 🔧 Configuratie## 🤝 Support



### API Endpoints AanpassenVoor vragen of problemen, neem contact op met het development team.


Wijzig URLs in `src/config/constants.ts`:

```typescript
export const API_BASE_URL = 'http://192.168.124.50:30500';
export const LOGIN_URL = 'http://192.168.124.50:30090/login';
export const EUCLOUD_URL = 'http://192.168.124.50:30080';
export const EUTYPE_URL = 'http://192.168.124.50:30081';
```

### NodePort Wijzigen

Pas `k8s/deployment.yaml` aan:

```yaml
spec:
  type: NodePort
  ports:
    - port: 80
      targetPort: 80
      nodePort: 30091  # Wijzig naar gewenste poort (30000-32767)
```

### Namespace Wijzigen

Huidige namespace: `eucloud`

Om te wijzigen, update in:
- `k8s/deployment.yaml`: `metadata.namespace`
- `.github/workflows/ci.yml`: alle `kubectl` commands met `-n eucloud`

## 🧪 Testing

### SSO Flow Testen

1. **Zonder cookie**:
   ```bash
   # Open incognito venster
   # Navigate to: http://192.168.124.50:30091/profile
   # Expected: redirect naar login?redirect=%2Fprofile
   ```

2. **Met geldige cookie**:
   ```bash
   # Login via login portal
   # Cookie: eusuite_token=<JWT>
   # Navigate to: http://192.168.124.50:30091/dashboard
   # Expected: Dashboard wordt getoond
   ```

3. **Logout**:
   ```bash
   # Klik logout button in header
   # Expected: redirect naar login?redirect=%2Fdashboard
   ```

📖 **Complete test scenarios**: Zie `SSO-IMPLEMENTATION.md`

## 📚 Documentatie

| Document | Beschrijving |
|----------|--------------|
| `SSO-IMPLEMENTATION.md` | Complete SSO implementatie details |
| `SSO-FLOW-VISUAL.md` | Visuele flow diagrams van SSO proces |
| `SSO-REDIRECT-FLOW.md` | Login frontend implementatie guide |
| `GITHUB-SECRETS-SETUP.md` | GitHub Actions secrets configuratie |
| `KUBERNETES-AUTO-DEPLOY.md` | Kubernetes deployment guide |
| `.github/copilot-instructions.md` | AI development instructions |

## 🐛 Troubleshooting

### ImagePullBackOff Error

**Symptoom**: Pods blijven hangen in `ImagePullBackOff` state

**Oplossing**:
```bash
# Check secret exists
kubectl get secret dockerhub-secret -n eucloud

# Manually recreate secret
kubectl create secret docker-registry dockerhub-secret \
  --docker-server=https://index.docker.io/v1/ \
  --docker-username=dylan016504 \
  --docker-password=<your-token> \
  -n eucloud

# Force pod restart
kubectl delete pods -n eucloud -l app=eusuite-dashboard
```

> **Note**: CI/CD pipeline handelt dit automatisch af sinds commit `8838883`

### Cookie Niet Gedeeld

**Symptoom**: Dashboard redirect continue naar login

**Oplossing**: Verificeer dat backend cookie instelt met:
- `Domain=192.168.124.50`
- `Path=/`
- `SameSite=Lax`

### CORS Errors

**Symptoom**: Fetch requests naar backend falen met CORS error

**Oplossing**: Zorg dat backend CORS configuratie bevat:
```javascript
cors({
  origin: [
    'http://192.168.124.50:30091', // Dashboard
    'http://192.168.124.50:30090', // Login
  ],
  credentials: true
})
```

## 🔐 Security

- ✅ HttpOnly cookies (niet leesbaar via JavaScript)
- ✅ SameSite=Lax (CSRF protection)
- ✅ Domain scoped cookies
- ✅ No tokens in URL parameters
- ✅ credentials: 'include' in fetch calls
- ⚠️ HTTPS in production (TODO)

## 📄 Licentie

Proprietary - EUsuite Project

## 🤝 Contributing

1. Fork het project
2. Maak een feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit je wijzigingen (`git commit -m 'Add some AmazingFeature'`)
4. Push naar branch (`git push origin feature/AmazingFeature`)
5. Open een Pull Request

## 👥 Team

Developed by Dylan for EUsuite Project

## 📞 Support

Voor vragen of problemen:
- Check documentatie in repository
- Open een GitHub Issue
- Contact development team

---

**Last Updated**: November 21, 2025  
**Version**: 1.0.0  
**Status**: ✅ Production Ready
