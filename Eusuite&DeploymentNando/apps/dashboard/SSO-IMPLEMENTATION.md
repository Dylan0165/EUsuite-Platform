# ✅ SSO Redirect Implementatie - EUsuite Dashboard

## 📋 Implementatie Overzicht

Het EUsuite Dashboard heeft een **centrale SSO-redirect flow** die automatisch gebruikers naar het login portal stuurt wanneer geen geldige cookie aanwezig is.

## 🔧 Implementatie Details

### 1. useAuth Hook (`src/hooks/useAuth.ts`)

**Functionaliteit:**
- ✅ Check `/api/auth/validate` met `credentials: "include"`
- ✅ Redirect naar login portal bij ongeldige token
- ✅ Behoudt huidige route in redirect parameter
- ✅ Loading state tijdens validatie
- ✅ Error handling met fallback

**Code:**
```typescript
const validateAuth = async () => {
  try {
    setLoading(true);
    setError(null);

    const response = await fetch(`${API_BASE_URL}/api/auth/validate`, {
      method: 'GET',
      credentials: 'include', // ✅ Stuurt eusuite_token cookie mee
    });

    if (response.ok) {
      const data = await response.json();
      if (data.valid && data.username) {
        setUser({ username: data.username, email: data.email });
      } else {
        throw new Error('Invalid token');
      }
    } else {
      throw new Error('Authentication failed');
    }
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Authentication failed');
    setUser(null);
    
    // ✅ Redirect naar login met huidige route
    const redirectPath = window.location.pathname + window.location.search;
    const redirectUrl = redirectPath === '/' ? '/dashboard' : redirectPath;
    window.location.href = `${LOGIN_URL}?redirect=${encodeURIComponent(redirectUrl)}`;
  } finally {
    setLoading(false);
  }
};
```

### 2. Layout Component (`src/components/Layout.tsx`)

**Functionaliteit:**
- ✅ Root layout voor alle routes
- ✅ Roept `useAuth()` aan bij elke route
- ✅ Toont loading spinner tijdens auth check
- ✅ Rendert header + content alleen als authenticated

**Code:**
```tsx
export const Layout = () => {
  const { user, loading, logout } = useAuth();

  // ✅ Loading state - voorkomt flashing van content
  if (loading) {
    return <LoadingSpinner />;
  }

  // Als we hier komen is user authenticated (anders was redirect al uitgevoerd)
  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} onLogout={logout} />
      <main>
        <Outlet />
      </main>
    </div>
  );
};
```

### 3. Router Configuration (`src/main.tsx`)

**Functionaliteit:**
- ✅ Alle routes onder `<Layout />` component
- ✅ Redirect van `/` naar `/dashboard`
- ✅ Catch-all route naar `/dashboard`

**Code:**
```tsx
<BrowserRouter>
  <Routes>
    <Route path="/" element={<Layout />}>
      <Route index element={<Navigate to="/dashboard" replace />} />
      <Route path="dashboard" element={<Dashboard />} />
      <Route path="profile" element={<Profile />} />
      <Route path="settings" element={<Settings />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Route>
  </Routes>
</BrowserRouter>
```

## 🔄 Complete Flow

### Scenario 1: Gebruiker zonder cookie bezoekt dashboard

```
1. User navigeert naar: http://192.168.124.50:30091/profile
2. Layout component mount → useAuth() triggered
3. validateAuth() fetch naar /api/auth/validate met credentials
4. Response: 401 Unauthorized (geen cookie)
5. Catch block: redirect naar login
   → http://192.168.124.50:30090/login?redirect=%2Fprofile
```

### Scenario 2: Gebruiker met geldige cookie

```
1. User navigeert naar: http://192.168.124.50:30091/dashboard
2. Layout component mount → useAuth() triggered
3. validateAuth() fetch naar /api/auth/validate met credentials
4. Response: 200 OK met { valid: true, username: "user", email: "..." }
5. setUser(data) → loading=false
6. Layout rendert Header + Dashboard
```

### Scenario 3: Logout

```
1. User klikt logout button
2. logout() POST naar /api/auth/logout
3. Backend clears cookie
4. Redirect naar: http://192.168.124.50:30090/login?redirect=%2Fdashboard
```

## 📦 Gebruikte Componenten

### LoadingSpinner (`src/components/LoadingSpinner.tsx`)
```tsx
export const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
);
```

### Constants (`src/config/constants.ts`)
```typescript
export const API_BASE_URL = 'http://192.168.124.50:30500';
export const LOGIN_URL = 'http://192.168.124.50:30090/login';
```

## ✅ Requirements Checklist

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Check `/api/auth/validate` | ✅ | `useAuth.ts:15` |
| Use `credentials: "include"` | ✅ | `useAuth.ts:17` |
| Redirect bij ongeldige token | ✅ | `useAuth.ts:34-36` |
| Redirect naar `?redirect=/dashboard` | ✅ | `useAuth.ts:35` |
| Werkt op alle routes | ✅ | `Layout.tsx` wraps alle routes |
| Centrale useAuth hook | ✅ | `useAuth.ts` |
| Root layout implementatie | ✅ | `Layout.tsx` |
| Loading state | ✅ | `useAuth.ts:8` + `Layout.tsx:9` |
| Error fallback | ✅ | `useAuth.ts:29-36` |
| Dashboard handelt GEEN login af | ✅ | Alleen redirect, geen login form |

## 🧪 Test Scenarios

### Test 1: Nieuwe gebruiker (geen cookie)
```bash
# Open browser in incognito mode
# Navigate to: http://192.168.124.50:30091/profile
# Expected: redirect naar http://192.168.124.50:30090/login?redirect=%2Fprofile
```

### Test 2: Direct naar dashboard (geen cookie)
```bash
# Navigate to: http://192.168.124.50:30091/dashboard
# Expected: redirect naar http://192.168.124.50:30090/login?redirect=%2Fdashboard
```

### Test 3: Root path (geen cookie)
```bash
# Navigate to: http://192.168.124.50:30091/
# Expected: redirect naar http://192.168.124.50:30090/login?redirect=%2Fdashboard
```

### Test 4: Geldige cookie
```bash
# Login via login portal
# Cookie: eusuite_token=<valid_jwt>
# Navigate to: http://192.168.124.50:30091/dashboard
# Expected: Dashboard wordt getoond
```

### Test 5: Verlopen cookie
```bash
# Wait for cookie expiry (backend bepaalt TTL)
# Refresh dashboard
# Expected: redirect naar login met current path
```

### Test 6: Logout
```bash
# Click logout button in header
# Expected: redirect naar http://192.168.124.50:30090/login?redirect=%2Fdashboard
```

## 🔒 Security Features

1. **HttpOnly Cookie**: Backend sets `eusuite_token` als HttpOnly (JavaScript kan niet lezen)
2. **SameSite**: Cookie heeft `SameSite=Lax` attribute
3. **Domain Scope**: Cookie geldt voor `192.168.124.50` (shared tussen login + dashboard)
4. **No Token in URL**: Token wordt NOOIT in URL parameters gestuurd
5. **Credentials Include**: Fetch requests gebruiken `credentials: 'include'`

## 📝 API Contract

### GET /api/auth/validate

**Request:**
```http
GET /api/auth/validate HTTP/1.1
Host: 192.168.124.50:30500
Cookie: eusuite_token=<JWT_TOKEN>
```

**Response (Valid - 200):**
```json
{
  "valid": true,
  "username": "john.doe",
  "email": "john@example.com"
}
```

**Response (Invalid - 401):**
```json
{
  "valid": false,
  "message": "Invalid or expired token"
}
```

### POST /api/auth/logout

**Request:**
```http
POST /api/auth/logout HTTP/1.1
Host: 192.168.124.50:30500
Cookie: eusuite_token=<JWT_TOKEN>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Sets Cookie:**
```http
Set-Cookie: eusuite_token=; Path=/; Domain=192.168.124.50; Expires=Thu, 01 Jan 1970 00:00:00 GMT
```

## 🚀 Deployment

De implementatie is volledig containerized en deployment-ready:

```bash
# Build Docker image
docker build -t dylan016504/eusuite-dashboard:latest .

# Push to Docker Hub
docker push dylan016504/eusuite-dashboard:latest

# Deploy to Kubernetes
kubectl apply -f k8s/deployment.yaml
```

**Access:**
```
http://192.168.124.50:30091
```

## 📚 Related Documentation

- `SSO-REDIRECT-FLOW.md` - Complete SSO flow met Login Frontend implementatie
- `GITHUB-SECRETS-SETUP.md` - GitHub Actions CI/CD configuratie
- `KUBERNETES-AUTO-DEPLOY.md` - Kubernetes deployment guide
- `README.md` - Project overzicht en setup instructies

---

## ✅ Conclusie

Het EUsuite Dashboard heeft een **volledig werkende SSO-redirect implementatie**:

- ✅ Automatische redirect naar login bij ontbrekende/ongeldige cookie
- ✅ Behoudt gewenste route in redirect parameter
- ✅ Centrale authenticatie check via `useAuth` hook
- ✅ Loading state voorkomt flashing
- ✅ Error handling met fallback
- ✅ Logout functionaliteit
- ✅ Werkt op alle routes via React Router

**Het dashboard handelt GEEN login af** - het redirects alleen naar het login portal en verwacht dat de login portal na succesvolle authenticatie terugredirect met een geldige cookie.
