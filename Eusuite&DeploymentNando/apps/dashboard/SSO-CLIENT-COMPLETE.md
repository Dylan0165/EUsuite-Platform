# ✅ EUsuite Dashboard - Volledige SSO Client Implementatie

## 📋 Requirements Checklist

### ✅ 1. Automatische Validate bij Mount

**Requirement:**
- GET `http://192.168.124.50:30500/api/auth/validate`
- Met `credentials: "include"`

**Implementatie:** `src/hooks/useAuth.ts` (regel 10-40)

```typescript
const validateAuth = async () => {
  try {
    setLoading(true);
    setError(null);

    // ✅ GET request naar validate endpoint
    const response = await fetch(`${API_BASE_URL}/api/auth/validate`, {
      method: 'GET',
      credentials: 'include', // ✅ Stuurt eusuite_token cookie mee
    });

    if (response.ok) {
      const data = await response.json();
      if (data.valid && data.username) {
        // ✅ Succesvol → dashboard tonen
        setUser({ username: data.username, email: data.email });
      } else {
        throw new Error('Invalid token');
      }
    } else {
      throw new Error('Authentication failed');
    }
  } catch (err) {
    // ✅ Mislukt → redirect naar login
    setError(err instanceof Error ? err.message : 'Authentication failed');
    setUser(null);
    const redirectPath = window.location.pathname + window.location.search;
    const redirectUrl = redirectPath === '/' ? '/dashboard' : redirectPath;
    window.location.href = `${LOGIN_URL}?redirect=${encodeURIComponent(redirectUrl)}`;
  } finally {
    setLoading(false);
  }
};

// ✅ Automatisch uitvoeren bij mount
useEffect(() => {
  validateAuth();
}, []);
```

**API Endpoint:** `http://192.168.124.50:30500/api/auth/validate`  
**Configuratie:** `src/config/constants.ts`

```typescript
export const API_BASE_URL = 'http://192.168.124.50:30500';
```

---

### ✅ 2. Automatische Redirect bij Falen

**Requirement:**
- Als validate faalt → redirect naar:
- `http://192.168.124.50:30090/login?redirect=/dashboard`

**Implementatie:** `src/hooks/useAuth.ts` (regel 29-36)

```typescript
catch (err) {
  setError(err instanceof Error ? err.message : 'Authentication failed');
  setUser(null);
  
  // ✅ Huidige route behouden in redirect parameter
  const redirectPath = window.location.pathname + window.location.search;
  const redirectUrl = redirectPath === '/' ? '/dashboard' : redirectPath;
  
  // ✅ Redirect naar login portal met redirect parameter
  window.location.href = `${LOGIN_URL}?redirect=${encodeURIComponent(redirectUrl)}`;
}
```

**Login URL:** `http://192.168.124.50:30090/login`  
**Configuratie:** `src/config/constants.ts`

```typescript
export const LOGIN_URL = 'http://192.168.124.50:30090/login';
```

**Voorbeelden:**
- User op `/profile` → redirect naar `login?redirect=%2Fprofile`
- User op `/settings` → redirect naar `login?redirect=%2Fsettings`
- User op `/` → redirect naar `login?redirect=%2Fdashboard`

---

### ✅ 3. Loading Screen

**Requirement:**
- Loading screen tijdens validate check

**Implementatie:** `src/components/LoadingSpinner.tsx`

```typescript
export const LoadingSpinner = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
};
```

**Gebruikt in:** `src/components/Layout.tsx` (regel 8-10)

```typescript
export const Layout = () => {
  const { user, loading, logout } = useAuth();

  // ✅ Loading screen tijdens auth check
  if (loading) {
    return <LoadingSpinner />;
  }

  // Content pas zichtbaar na succesvolle validate
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

---

### ✅ 4. Log Uit Knop

**Requirement:**
- POST `/api/auth/logout`
- Met `credentials: "include"`
- Redirect naar login

**Implementatie:** `src/hooks/useAuth.ts` (regel 42-54)

```typescript
const logout = async () => {
  try {
    // ✅ POST request naar logout endpoint
    await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include', // ✅ Stuurt cookie mee voor invalidatie
    });
    
    setUser(null);
    
    // ✅ Redirect naar login met dashboard als default
    window.location.href = `${LOGIN_URL}?redirect=${encodeURIComponent('/dashboard')}`;
  } catch (err) {
    console.error('Logout failed:', err);
    // Fallback redirect zelfs bij fout
    window.location.href = LOGIN_URL;
  }
};
```

**Logout Knop:** `src/components/Header.tsx` (regel 27-33)

```typescript
<button
  onClick={onLogout}
  className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors duration-200"
>
  <LogOut className="h-4 w-4" />
  <span>Logout</span>
</button>
```

**API Endpoint:** `http://192.168.124.50:30500/api/auth/logout`

---

## 🔄 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ 1. USER NAVIGEERT NAAR DASHBOARD                            │
│    http://192.168.124.50:30091                              │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. LAYOUT COMPONENT MOUNT                                   │
│    useAuth() hook geactiveerd                               │
│    Loading state = true                                     │
│    → <LoadingSpinner /> wordt getoond                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. VALIDATE AUTH                                            │
│    GET http://192.168.124.50:30500/api/auth/validate       │
│    credentials: "include"                                   │
│    Cookie: eusuite_token=<JWT>                             │
└────────────┬───────────────────────────┬────────────────────┘
             │                           │
   ┌─────────▼──────────┐      ┌────────▼─────────┐
   │ RESPONSE 200 OK    │      │ RESPONSE 401     │
   │ { valid: true,     │      │ { valid: false } │
   │   username: "...", │      │                  │
   │   email: "..." }   │      │                  │
   └─────────┬──────────┘      └────────┬─────────┘
             │                           │
             ▼                           ▼
┌──────────────────────┐    ┌──────────────────────────────┐
│ 4a. SUCCES PATH      │    │ 4b. FAILURE PATH             │
│ setUser(data)        │    │ setUser(null)                │
│ loading = false      │    │ window.location.href =       │
│                      │    │   "login?redirect=/dashboard"│
│ → Dashboard tonen ✅ │    │ → Redirect naar login ⤴     │
└──────────┬───────────┘    └──────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. DASHBOARD CONTENT                                         │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Header: username="john.doe" [Logout]                    │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Dashboard Cards: [EUCloud] [EUType] [Profile] [Settings]│ │
│ └─────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────┘
                         │
          ┌──────────────▼───────────────┐
          │ USER KLIKT [Logout] KNOP    │
          └──────────────┬───────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. LOGOUT FLOW                                              │
│    POST http://192.168.124.50:30500/api/auth/logout        │
│    credentials: "include"                                   │
│    → Backend clears cookie                                  │
│    → Redirect naar login?redirect=/dashboard               │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 File Structure & Implementatie

```
src/
├── hooks/
│   └── useAuth.ts              ← ✅ Centrale SSO logica
│       ├── validateAuth()      ← GET /api/auth/validate
│       ├── logout()            ← POST /api/auth/logout
│       └── useEffect()         ← Auto-execute bij mount
│
├── components/
│   ├── Layout.tsx              ← ✅ useAuth consumer + loading
│   │   ├── if (loading)        ← Loading screen
│   │   └── else                ← Dashboard content
│   │
│   ├── Header.tsx              ← ✅ Username + Logout button
│   │   └── <button onClick={onLogout}>
│   │
│   └── LoadingSpinner.tsx      ← ✅ Loading UI component
│
├── config/
│   └── constants.ts            ← ✅ API URLs
│       ├── API_BASE_URL        ← http://192.168.124.50:30500
│       └── LOGIN_URL           ← http://192.168.124.50:30090/login
│
└── types/
    └── auth.ts                 ← ✅ TypeScript types
        └── User interface
```

---

## 🧪 Test Scenarios

### Scenario 1: Nieuwe Gebruiker (Geen Cookie)

**Stappen:**
1. Open incognito browser
2. Navigate naar `http://192.168.124.50:30091`

**Verwacht gedrag:**
- LoadingSpinner verschijnt (~0.5s)
- GET request naar `/api/auth/validate` faalt (401)
- Automatische redirect naar:
  ```
  http://192.168.124.50:30090/login?redirect=%2Fdashboard
  ```

**Verificatie:**
```bash
# Check browser network tab
Request: GET /api/auth/validate
Status: 401 Unauthorized
Cookie: (none)

# Browser URL changes to:
http://192.168.124.50:30090/login?redirect=%2Fdashboard
```

---

### Scenario 2: Gebruiker met Geldige Cookie

**Stappen:**
1. Login via login portal (krijg eusuite_token cookie)
2. Navigate naar `http://192.168.124.50:30091`

**Verwacht gedrag:**
- LoadingSpinner verschijnt (~0.5s)
- GET request naar `/api/auth/validate` succesvol (200)
- Dashboard content wordt getoond
- Header toont username
- Logout button zichtbaar

**Verificatie:**
```bash
# Check browser network tab
Request: GET /api/auth/validate
Status: 200 OK
Cookie: eusuite_token=<JWT>

Response:
{
  "valid": true,
  "username": "john.doe",
  "email": "john@example.com"
}

# Dashboard renders with:
- Header: "john.doe" [Logout]
- Cards: EUCloud, EUType, Profile, Settings
```

---

### Scenario 3: Logout Actie

**Stappen:**
1. User is ingelogd op dashboard
2. Klik op [Logout] button in header

**Verwacht gedrag:**
- POST request naar `/api/auth/logout`
- Backend clears eusuite_token cookie
- Automatische redirect naar:
  ```
  http://192.168.124.50:30090/login?redirect=%2Fdashboard
  ```

**Verificatie:**
```bash
# Check browser network tab
Request: POST /api/auth/logout
Status: 200 OK
Cookie: eusuite_token=<JWT> (last time sent)

Response:
{
  "success": true,
  "message": "Logged out successfully"
}

Set-Cookie: eusuite_token=; Expires=Thu, 01 Jan 1970 00:00:00 GMT

# Browser URL changes to:
http://192.168.124.50:30090/login?redirect=%2Fdashboard
```

---

### Scenario 4: Expired Cookie

**Stappen:**
1. User heeft verouderde/expired cookie
2. Navigate naar `http://192.168.124.50:30091/profile`

**Verwacht gedrag:**
- LoadingSpinner verschijnt
- GET request naar `/api/auth/validate` faalt (401)
- Automatische redirect naar:
  ```
  http://192.168.124.50:30090/login?redirect=%2Fprofile
  ```

**Verificatie:**
```bash
Request: GET /api/auth/validate
Status: 401 Unauthorized
Cookie: eusuite_token=<expired_JWT>

# Browser URL changes to:
http://192.168.124.50:30090/login?redirect=%2Fprofile

# After login, user returns to /profile (not /dashboard)
```

---

## 🔐 Security Features

### 1. HttpOnly Cookie
- Backend sets cookie met `HttpOnly` flag
- JavaScript kan cookie **niet lezen**
- Bescherming tegen XSS attacks

### 2. SameSite Cookie Attribute
- Cookie heeft `SameSite=Lax`
- Bescherming tegen CSRF attacks
- Cookie wordt alleen meegestuurd bij same-site requests

### 3. Credentials Include
- Alle fetch requests gebruiken `credentials: 'include'`
- Cookie wordt automatisch meegestuurd
- Geen manual cookie handling nodig

### 4. Domain Scoped Cookie
- Cookie geldt voor `192.168.124.50` domain
- Shared tussen alle services (login, dashboard, eucloud, eutype)
- Geen cross-domain cookie issues

### 5. No Token in URL
- JWT token **nooit** in URL parameters
- Alleen in HttpOnly cookie
- Geen token leakage via browser history/logs

---

## 📊 API Contract

### GET /api/auth/validate

**Request:**
```http
GET /api/auth/validate HTTP/1.1
Host: 192.168.124.50:30500
Cookie: eusuite_token=<JWT_TOKEN>
```

**Response (Valid - 200 OK):**
```json
{
  "valid": true,
  "username": "john.doe",
  "email": "john.doe@example.com"
}
```

**Response (Invalid - 401 Unauthorized):**
```json
{
  "valid": false,
  "message": "Invalid or expired token"
}
```

---

### POST /api/auth/logout

**Request:**
```http
POST /api/auth/logout HTTP/1.1
Host: 192.168.124.50:30500
Cookie: eusuite_token=<JWT_TOKEN>
Content-Type: application/json
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Headers:**
```http
Set-Cookie: eusuite_token=; Path=/; Domain=192.168.124.50; Expires=Thu, 01 Jan 1970 00:00:00 GMT
```

---

## ✅ Requirement Completion Matrix

| Requirement | Status | Implementatie | Test |
|-------------|--------|---------------|------|
| GET /api/auth/validate bij mount | ✅ | `useAuth.ts:15-18` | Scenario 1, 2 |
| credentials: "include" | ✅ | `useAuth.ts:17` | Alle scenarios |
| Success → dashboard tonen | ✅ | `useAuth.ts:20-26` | Scenario 2 |
| Failure → redirect login | ✅ | `useAuth.ts:29-36` | Scenario 1, 4 |
| Redirect parameter correctheid | ✅ | `useAuth.ts:33-35` | Scenario 1, 4 |
| Loading screen | ✅ | `LoadingSpinner.tsx`, `Layout.tsx:9-10` | Alle scenarios |
| Logout knop | ✅ | `Header.tsx:27-33` | Scenario 3 |
| POST /api/auth/logout | ✅ | `useAuth.ts:43-46` | Scenario 3 |
| Logout redirect | ✅ | `useAuth.ts:49` | Scenario 3 |
| Auto-execute bij mount | ✅ | `useAuth.ts:57-59` | Alle scenarios |

---

## 🎯 Conclusie

**Status: ✅ VOLLEDIG GEÏMPLEMENTEERD**

Het EUsuite Dashboard is nu een **volledige SSO-client** met:

1. ✅ **Automatische validate** bij mount via `useAuth` hook
2. ✅ **Credentials include** voor cookie-based auth
3. ✅ **Success flow** → dashboard content tonen
4. ✅ **Failure flow** → automatische redirect naar login
5. ✅ **Loading screen** tijdens auth check
6. ✅ **Logout functionaliteit** met POST request
7. ✅ **Redirect parameter** behoudt user intent
8. ✅ **Error handling** met fallbacks
9. ✅ **TypeScript** voor type safety
10. ✅ **Clean UI** met Tailwind CSS

**Alle code is production-ready en gedocumenteerd!**

---

**Last Updated:** November 21, 2025  
**Version:** 1.0.0  
**Status:** ✅ Production Ready
