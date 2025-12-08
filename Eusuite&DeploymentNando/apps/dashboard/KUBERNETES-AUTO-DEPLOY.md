# Automatische Kubernetes Deployment Setup

## 🔐 KUBE_CONFIG Secret toevoegen

Om automatische deployment naar je K3s cluster te activeren, moet je je kubeconfig als secret toevoegen.

### Stap 1: Haal je kubeconfig op (op je K3s server)

```bash
# Op je K3s server (192.168.124.50)
sudo cat /etc/rancher/k3s/k3s.yaml
```

Of als je kubectl lokaal gebruikt:
```bash
cat ~/.kube/config
```

### Stap 2: Encode naar Base64

**Linux/Mac:**
```bash
cat /etc/rancher/k3s/k3s.yaml | base64 -w 0
```

**Windows PowerShell:**
```powershell
$content = Get-Content /etc/rancher/k3s/k3s.yaml -Raw
[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($content))
```

### Stap 3: Voeg toe als GitHub Secret

1. Ga naar je GitHub repo: **Settings** → **Secrets and variables** → **Actions**
2. Klik op **New repository secret**
3. **Name**: `KUBE_CONFIG`
4. **Secret**: Plak de base64-encoded string
5. Klik **Add secret**

### ⚠️ Belangrijk: Server URL aanpassen

De kubeconfig bevat waarschijnlijk `server: https://127.0.0.1:6443`. Dit moet je aanpassen naar je externe IP:

**Voordat je encodeert**, pas dit aan in het bestand:
```yaml
server: https://192.168.124.50:6443
```

Of na het decoden kan de workflow dit automatisch fixen (laat me weten als je dit wilt).

## 🚀 Wat gebeurt er dan automatisch?

Bij elke push naar `main`:

1. ✅ **Build** - Docker image wordt gebouwd
2. ✅ **Push** - Image naar `dylan016504/eusuite-dashboard:latest` en `:commit-sha`
3. ✅ **Deploy** - Automatisch deployen naar K3s cluster op `192.168.124.50:30091`
4. ✅ **Verify** - Controleren of pods draaien en service actief is

## 🔍 Deployment controleren

Na een push, check de **Actions** tab in GitHub om te zien:
- Build status
- Deploy status
- Pod status
- Service endpoints

## 🛠️ Eerste keer deployment

Als het de eerste keer is, moet je de deployment eenmalig aanmaken:

```bash
kubectl apply -f https://raw.githubusercontent.com/Dylan0165/DashAppEUSUITE/main/k8s/deployment.yaml
```

Daarna zal de CI/CD pipeline alleen de image updaten (sneller dan volledige apply).

## ✅ Verificatie

Na succesvolle deployment:
- Dashboard beschikbaar op: `http://192.168.124.50:30091`
- Redirect naar SSO login: `http://192.168.124.50:30090/login`

## 🐛 Troubleshooting

### "Unable to connect to the server"
- Controleer of de `server:` URL in kubeconfig correct is (`192.168.124.50:6443`)
- Zorg dat de K3s server bereikbaar is vanaf GitHub Actions runners (mogelijk firewall)

### "Error from server (NotFound): deployments.apps "eusuite-dashboard" not found"
- Run eerst de initial deployment handmatig (zie "Eerste keer deployment")

### Deployment duurt lang of failt
- Check de logs: `kubectl logs -l app=eusuite-dashboard`
- Verify de image: `kubectl describe pod -l app=eusuite-dashboard`
