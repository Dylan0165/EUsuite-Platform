# EUTYPE - Professionele Tekstverwerker

Een geavanceerde tekstverwerker gebouwd met React, geïnspireerd door Microsoft Word. Nu volledig geïntegreerd met EU-CORE-BACKEND voor cloud document storage.

## 🌐 Deployment Modes

### 1. Cloud Version (Production) ☁️
Backend-geïntegreerde versie met:
- ✅ JWT authenticatie
- ✅ Cloud document storage via EU-CORE-BACKEND
- ✅ Real-time auto-save
- ✅ Multi-user support
- ✅ Kubernetes deployment (k3s cluster)
- ✅ CI/CD via GitHub Actions

**Access**: http://192.168.124.50:30081 (NodePort 30081)

**Backend API**: http://192.168.124.50:30500/api

### 2. Desktop App (Legacy) 💻
Standalone Electron app met lokaal opslaan.

**Features:**
- ✅ Offline werken
- ✅ Lokaal bestandssysteem
- ✅ Native PDF export

## 🚀 Quick Start (Cloud Version)

### Prerequisites
- Node.js 18+
- Access to EU-CORE-BACKEND API
- k3s cluster (voor deployment)

### Installation

```bash
# Clone repository
git clone <repository-url>
cd Type

# Install dependencies
npm install

# Setup environment
cp .env.example .env.development

# Start development server
npm run dev
```

### Environment Variables

`.env.development`:
```env
VITE_API_BASE=http://192.168.124.50:30500/api
```

## � Docker Deployment

```bash
# Build image
docker build -t eutype-frontend:latest .

# Run locally
docker run -p 8080:80 eutype-frontend:latest
```

## ☸️ Kubernetes Deployment

```bash
# Apply manifests
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml

# Check status
kubectl get pods -n eucloud
kubectl get svc -n eucloud
```

**Access**: http://192.168.124.50:30081

## 🔄 CI/CD Pipeline

Push to `main` branch triggers automatic deployment:
1. Build Docker image
2. Push to GHCR (ghcr.io/dylan0165/eutype-frontend)
3. Update k3s deployment
4. Rollout verification

## 🛠️ Desktop App (Legacy)

### Desktop App (Aanbevolen)
De desktop app biedt volledige functionaliteit met lokaal opslaan, PDF export en offline werken.

**Download opties:**
1. **Pre-built installer** (komt binnenkort)
2. **Zelf builden** (zie instructies hieronder)

### Web Versie
De web versie is beschikbaar op http://localhost:5173 maar heeft beperkte functionaliteit (geen lokaal opslaan).

## 🛠️ Desktop App Builden

### Vereisten
- Node.js 18+ en npm
- Git (optioneel)

### Stappen
```bash
# 1. Clone of download het project
git clone <repository-url>
cd Type

# 2. Installeer dependencies
npm install

# 3. Build de desktop app
npm run electron:build

# 4. Vind de installer in:
# dist-electron/EUTYPE Setup 1.0.0.exe (Windows)
```

### Development Mode
Om de app in development mode te draaien:
```bash
npm run electron:dev
```

## ✨ Premium Features

### 📄 Document Layout
- ✅ **A4 Formaat** - Echte A4 paginaweergave (210mm x 297mm)
- ✅ **Print-ready** - Professionele marges en print layout
- ✅ **Pagina weergave** - Zoals Word, met schaduw effect

### 📝 Tekst Opmaak
- ✅ **Basis opmaak**: Vetgedrukt, Cursief, Onderstreept, Doorhalen
- ✅ **Geavanceerde opmaak**: Subscript (X₂), Superscript (X²)
- ✅ **Kleuren**: Tekstkleur en markeerstift
- ✅ **Lettertypen**: Calibri, Arial, Times New Roman, en meer
- ✅ **Lettergroottes**: 8pt tot 72pt

### 🎨 Stijlen (zoals Word)
- ✅ **Standaard** - Normale paragraaf
- ✅ **Titel** - Hoofdtitel (Kop 1)
- ✅ **Kop 1 t/m 6** - Hiërarchische koppen
- ✅ **Ondertitel** - Subtitel styling
- ✅ Alle koppen met professionele kleuren (blauw thema)

### 📋 Paragraaf Opmaak
- ✅ **Uitlijning**: Links, Midden, Rechts, Uitvullen
- ✅ **Lijsten**: Opsommingstekens, Genummerd, Takenlijst
- ✅ **Inspringen**: Meerdere niveaus
- ✅ **Citaten**: Professionele blockquote styling

### 📑 Automatische Inhoudsopgave
- ✅ **Intelligente detectie** - Alle koppen automatisch verzameld
- ✅ **Hiërarchische structuur** - Kop 1, 2, 3 met inspringen
- ✅ **Klikbaar** - Spring direct naar hoofdstuk
- ✅ **Paginanummers** - Automatisch gegenereerd
- ✅ **Auto-update** - Past zich aan bij wijzigingen

### 🖼️ Invoegen Menu
- ✅ **Tabellen** - Met header en gestileerde rijen
- ✅ **Afbeeldingen** - Via URL
- ✅ **Links** - Hyperlinks invoegen
- ✅ **Horizontale lijnen** - Pagina scheidingen

### 📊 Statusbalk
- ✅ **Woordentelling** - Real-time tellen
- ✅ **Tekens met spaties**
- ✅ **Tekens zonder spaties**
- ✅ Nederlandse getallenweer gave (1.234 in plaats van 1,234)

### 💾 Bestand Operaties
- ✅ **Opslaan** - JSON formaat (behoudt alle opmaak)
- ✅ **Openen** - Laad eerder opgeslagen documenten
- ✅ **Nieuw** - Leeg document maken

## 🎯 Gebruik

### Stijlen toepassen
1. Klik op **📋 Stijlen** dropdown
2. Kies **Kop 1**, **Kop 2**, **Kop 3**, etc.
3. Deze worden automatisch opgepikt door de inhoudsopgave

### Inhoudsopgave invoegen
1. Klik op **➕ Invoegen** menu
2. Selecteer **📑 Inhoudsopgave**
3. De sidebar toont alle koppen
4. Klik op een kop om ernaartoe te springen
5. De inhoudsopgave update automatisch!

### Professioneel document maken
1. Start met een **Titel** (Kop 1)
2. Voeg **Kop 2** toe voor hoofdstukken
3. Gebruik **Kop 3** voor paragrafen
4. Voeg inhoudsopgave in
5. Opslaan en printen!

## 🚀 Installatie

```powershell
# Installeer dependencies
npm install
```

## 📝 Development

### Web versie (in browser)
```powershell
npm run dev
```
Open dan http://localhost:5173 in je browser.

### Desktop versie (Electron)
```powershell
npm run electron:dev
```
Dit start zowel de Vite dev server als Electron.

## 📦 Build

### Desktop build (.exe voor Windows)
```powershell
npm run electron:build
```

De installer wordt aangemaakt in de `dist-electron` folder.

## 🎯 MVP Scope vs Premium

**Originele MVP:**
- Basis tekst opmaak (bold, italic, underline)
- Simpel opslaan/openen

**Nu PREMIUM features:**
- ✅ A4 formaat met marges
- ✅ Automatische inhoudsopgave
- ✅ Stijlen systeem (Kop 1-6, Titel, Ondertitel)
- ✅ Uitgebreide opmaak (kleuren, fonts, sizes)
- ✅ Tabellen en afbeeldingen
- ✅ Professionele Word-achtige UI
- ✅ Real-time woordentelling
- ✅ Takenlijsten met checkboxes

**NIET (nog) inbegrepen:**
- PDF export
- DOCX ondersteuning
- Cloud sync
- Spellingscontrole
- Track changes
- Commentaar functie

## 🛠️ Tech Stack

- **React** - UI framework
- **Vite** - Build tool
- **TipTap** - Rich text editor
- **Electron** - Desktop wrapper

## 📄 Bestandsformaten

### Native formaat: `.ty` (EUTYPE Document)
EUTYPE gebruikt zijn eigen `.ty` bestandsformaat dat:
- Alle opmaak behoudt (bold, italic, colors, etc.)
- Tabellen, afbeeldingen en links ondersteunt
- Metadata opslaat (creation/modification dates)
- JSON-gebaseerd en menselijk leesbaar is
- Snel laden en klein bestandsformaat heeft

### Ondersteunde formaten
- **Import**: `.ty`, `.txt`, `.html`
- **Export**: `.ty`, `.txt`, `.html`, `.pdf`
- **Toekomstig**: `.docx`, `.rtf`, `.odt`

Zie [TY_FORMAT.md](TY_FORMAT.md) voor technische details.

## 🗺️ Roadmap

1. ✅ MVP - Basis editor met opmaak
2. 🔜 Afbeeldingen invoegen
3. 🔜 PDF export
4. 🔜 Lettertypes & font sizes
5. 🔜 Tabellen
6. 🔜 DOCX ondersteuning
7. 🔜 Real-time samenwerken

## 📝 Licentie

MIT
