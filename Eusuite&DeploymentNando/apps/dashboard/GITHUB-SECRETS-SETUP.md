# GitHub Secrets Setup voor EUsuite Dashboard

## Vereiste Secrets

Om de CI/CD pipeline te laten werken, moet je de volgende secrets toevoegen aan je GitHub repository:

### 1. Docker Registry Credentials

Ga naar: **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

#### DOCKER_USERNAME
- **Name**: `DOCKER_USERNAME`
- **Value**: `dylan016504`

#### DOCKER_PASSWORD
- **Name**: `DOCKER_PASSWORD`  
- **Value**: `[Jouw Docker Hub access token]`

> **Hoe krijg je een Docker token?**
> 1. Log in op [Docker Hub](https://hub.docker.com)
> 2. Ga naar **Account Settings** → **Security** → **New Access Token**
> 3. Geef het een naam (bijv. "GitHub Actions")
> 4. Kopieer het token en plak het als secret

### 2. Kubernetes Deployment (Optioneel)

Als je automatische deployment naar K8s wilt:

#### KUBE_CONFIG
- **Name**: `KUBE_CONFIG`
- **Value**: Base64-encoded kubeconfig bestand

```bash
# Op je lokale machine (waar kubectl werkt):
cat ~/.kube/config | base64 -w 0
# Of op Windows PowerShell:
[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((Get-Content ~/.kube/config -Raw)))
```

Kopieer de output en plak als secret.

#### ENABLE_K8S_DEPLOY (Variable)
- Ga naar **Settings** → **Secrets and variables** → **Actions** → **Variables** tab
- **Name**: `ENABLE_K8S_DEPLOY`
- **Value**: `true` (of `false` om K8s deployment uit te schakelen)

## Docker Image Registry aanpassen

Momenteel staat in de workflow:
```yaml
env:
  IMAGE_NAME: your-registry/eusuite-dashboard
```

**Pas dit aan naar jouw Docker Hub gebruikersnaam:**

1. Open `.github/workflows/ci.yml`
2. Wijzig regel 7:
```yaml
env:
  IMAGE_NAME: dylan016504/eusuite-dashboard
```

3. Commit en push:
```bash
git add .github/workflows/ci.yml
git commit -m "Update Docker image name"
git push
```

## Verificatie

Na het toevoegen van de secrets:

1. Ga naar **Actions** tab in je GitHub repo
2. Klik op de laatste workflow run
3. Controleer of de build succesvol is
4. Check Docker Hub of de image is gepusht

## Workflow Overzicht

De CI/CD pipeline doet het volgende:

1. **Build Stage**: 
   - Checkout code
   - Setup Docker Buildx
   - Login naar Docker registry
   - Build en push Docker image met tags:
     - `IMAGE_NAME:latest`
     - `IMAGE_NAME:<commit-sha>`

2. **Deploy Stage** (optioneel):
   - Setup kubectl
   - Deploy naar K8s cluster
   - Update deployment met nieuwe image tag

## Troubleshooting

### Docker login failed
- Controleer of `DOCKER_USERNAME` en `DOCKER_PASSWORD` correct zijn ingevuld
- Zorg dat het Docker token **Read & Write** permissies heeft

### Kubernetes deployment failed
- Controleer of `KUBE_CONFIG` correct is (base64-encoded)
- Zorg dat de kubeconfig geldig is en toegang heeft tot je cluster
- Set `ENABLE_K8S_DEPLOY` variable op `true`

### Image not found
- Pas `IMAGE_NAME` aan naar `dylan016504/eusuite-dashboard`
- Controleer of je Docker Hub repository public is (of credentials correct zijn)
