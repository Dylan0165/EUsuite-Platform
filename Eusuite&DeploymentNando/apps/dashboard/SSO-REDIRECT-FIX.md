# 🔧 SSO Redirect Loop Fix

## ❌ Probleem

Het Dashboard (port 30091) stuurde gebruikers **altijd** direct naar het login portal (30090), ook als ze al waren ingelogd via EUCloud.

### Root Cause

De `useAuth.ts` hook deed een **te vroege redirect** omdat **elk soort fout** werd gezien alsof de gebruiker niet was ingelogd:

```typescript
// ❌ OUDE CODE (FOUT)
catch (err) {
  setError(err instanceof Error ? err.message : 'Authentication failed');
  setUser(null);
  
  // ❌ Redirect bij ELKE fout (timeout, network, CORS, JSON parse, etc)
  const redirectPath = window.location.pathname + window.location.search;
  const redirectUrl = redirectPath === '/' ? '/dashboard' : redirectPath;
  window.location.href = `${LOGIN_URL}?redirect=${encodeURIComponent(redirectUrl)}`;
}
```

### Waarom was dit fout?

Redirect gebeurde bij **elk soort error**:

| Error Type | Voorbeeld | Redirect? | Correct? |
|------------|-----------|-----------|----------|
| **401 Unauthorized** | Gebruiker niet ingelogd | ✅ Ja | ✅ Correct |
| **Network timeout** | Backend reageert niet | ✅ Ja | ❌ FOUT |
| **CORS preflight** | OPTIONS request faalt | ✅ Ja | ❌ FOUT |
| **500 Server Error** | Backend crash | ✅ Ja | ❌ FOUT |
| **502 Bad Gateway** | Nginx down | ✅ Ja | ❌ FOUT |
| **JSON parse error** | Malformed response | ✅ Ja | ❌ FOUT |
| **DNS failure** | Netwerk probleem | ✅ Ja | ❌ FOUT |

**Resultaat:** Oneindige redirect loop en frustrerende user experience.

---

## ✅ Oplossing

### 1. Redirect ALLEEN bij HTTP 401

```typescript
// ✅ NIEUWE CODE (CORRECT)
const response = await fetch(`${API_BASE_URL}/api/auth/validate`, {
  method: 'GET',
  credentials: 'include',
});

// ✅ Check specifiek voor 401 status
if (response.status === 401) {
  console.log('401 Unauthorized - Gebruiker niet ingelogd, redirect naar login');
  setUser(null);
  setError('Not authenticated');
  
  // Redirect naar login met current path
  const redirectPath = window.location.pathname + window.location.search;
  const redirectUrl = redirectPath === '/' ? '/dashboard' : redirectPath;
  window.location.href = `${LOGIN_URL}?redirect=${encodeURIComponent(redirectUrl)}`;
  return; // Stop verdere verwerking
}
```

### 2. Andere fouten: GEEN redirect

```typescript
// ✅ Bij andere HTTP errors (500, 502, 503, etc)
if (!response.ok) {
  const errorMsg = `Backend error: ${response.status} ${response.statusText}`;
  console.error(errorMsg);
  setError(errorMsg);
  setUser(null);
  setLoading(false);
  return; // Stop, maar GEEN redirect
}
```

### 3. Network errors: GEEN redirect

```typescript
// ✅ Catch block voor network errors
catch (err) {
  const errorMsg = err instanceof Error ? err.message : 'Network error';
  console.error('Validate request failed (network/timeout):', errorMsg);
  setError(errorMsg);
  setUser(null);
  // GEEN window.location.href hier!
} finally {
  setLoading(false);
}
```

---

## 📊 Nieuwe Flow Logic

```
┌─────────────────────────────────────────────────────────┐
│ fetch /api/auth/validate (credentials: "include")      │
└──────────────────────┬──────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┬───────────────────────┐
        │                             │                       │
        ▼                             ▼                       ▼
┌───────────────┐          ┌───────────────────┐   ┌──────────────────┐
│ Status: 200   │          │ Status: 401       │   │ Status: 500/502  │
│ Response OK   │          │ Unauthorized      │   │ Server Error     │
└───────┬───────┘          └─────────┬─────────┘   └────────┬─────────┘
        │                            │                       │
        ▼                            ▼                       ▼
┌───────────────┐          ┌───────────────────┐   ┌──────────────────┐
│ Parse JSON    │          │ ✅ REDIRECT       │   │ ❌ GEEN redirect │
│ Set user      │          │ naar login        │   │ Set error        │
│ loading=false │          │ ?redirect=...     │   │ user=null        │
│ ✅ Dashboard  │          │                   │   │ loading=false    │
└───────────────┘          └───────────────────┘   └──────────────────┘
        │
        ▼
┌───────────────────────────────────────────────────────────┐
│ Network Error (timeout, CORS, DNS)                       │
│ → Catch block                                             │
│ → ❌ GEEN redirect                                        │
│ → Set error, user=null, loading=false                    │
└───────────────────────────────────────────────────────────┘
```

---

## 🔍 Error Handling Matrix

| Scenario | HTTP Status | Action | Redirect? | User Experience |
|----------|-------------|--------|-----------|-----------------|
| **Niet ingelogd** | 401 | ✅ Redirect | Ja | → Login portal |
| **Geldige cookie** | 200 | Set user | Nee | ✅ Dashboard |
| **Backend down** | 502/503 | Error log | Nee | Error message + retry mogelijk |
| **Backend crash** | 500 | Error log | Nee | Error message |
| **Network timeout** | (geen) | Error log | Nee | "Network error" message |
| **CORS issue** | (geen) | Error log | Nee | Dev moet CORS fixen |
| **DNS failure** | (geen) | Error log | Nee | "Network error" message |
| **Malformed JSON** | 200 | Error log | Nee | "Invalid response" |

---

## 📝 Complete Nieuwe useAuth.ts

```typescript
import { useState, useEffect } from 'react';
import { API_BASE_URL, LOGIN_URL } from '../config/constants';
import type { User } from '../types/auth';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const validateAuth = async () => {
    try {
      setLoading(true);
      setError(null);

      // ✅ Fetch naar backend op port 30500 (NIET 30091)
      const response = await fetch(`${API_BASE_URL}/api/auth/validate`, {
        method: 'GET',
        credentials: 'include', // ✅ Stuurt eusuite_token cookie mee
      });

      // ✅ ALLEEN bij 401 redirect naar login
      if (response.status === 401) {
        console.log('401 Unauthorized - Gebruiker niet ingelogd, redirect naar login');
        setUser(null);
        setError('Not authenticated');
        
        const redirectPath = window.location.pathname + window.location.search;
        const redirectUrl = redirectPath === '/' ? '/dashboard' : redirectPath;
        window.location.href = `${LOGIN_URL}?redirect=${encodeURIComponent(redirectUrl)}`;
        return;
      }

      // ✅ Bij andere fouten: GEEN redirect
      if (!response.ok) {
        const errorMsg = `Backend error: ${response.status} ${response.statusText}`;
        console.error(errorMsg);
        setError(errorMsg);
        setUser(null);
        setLoading(false);
        return;
      }

      // ✅ Response OK - Parse en valideer
      const data = await response.json();
      
      if (data.valid && data.username) {
        console.log('Auth validate succesvol:', data.username);
        setUser({ 
          username: data.username, 
          email: data.email || '' 
        });
        setError(null);
      } else {
        console.warn('Validate response was 200 maar data.valid is false');
        setUser(null);
        setError('Invalid response from backend');
      }

    } catch (err) {
      // ✅ Network errors - GEEN redirect
      const errorMsg = err instanceof Error ? err.message : 'Network error';
      console.error('Validate request failed (network/timeout):', errorMsg);
      setError(errorMsg);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      console.log('Logging out...');
      
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
      
      setUser(null);
      window.location.href = `${LOGIN_URL}?redirect=${encodeURIComponent('/dashboard')}`;
    } catch (err) {
      console.error('Logout request failed:', err);
      setUser(null);
      window.location.href = LOGIN_URL;
    }
  };

  useEffect(() => {
    validateAuth();
  }, []);

  return { 
    user, 
    loading, 
    error, 
    logout, 
    refetch: validateAuth 
  };
};
```

---

## ✅ Verificatie Layout.tsx

De `Layout.tsx` is correct en doet **geen vroege redirect**:

```typescript
export const Layout = () => {
  const { user, loading, logout } = useAuth();

  // ✅ Wacht op loading === false
  if (loading) {
    return <LoadingSpinner />;
  }

  // ✅ Rendert dashboard content zelfs als user === null
  // (useAuth.ts handelt redirect af, niet Layout)
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

**Belangrijk:** Layout doet **GEEN** redirect check. De redirect logica zit **alleen** in `useAuth.ts` bij status 401.

---

## 🧪 Test Scenarios

### Test 1: Gebruiker al ingelogd via EUCloud

**Setup:**
- User logt in via EUCloud (port 30080)
- Cookie `eusuite_token` wordt gezet op domain `192.168.124.50`
- User navigeert naar Dashboard (port 30091)

**Verwacht gedrag:**
```
1. Dashboard mount → useAuth() → validateAuth()
2. GET /api/auth/validate met cookie
3. Response: 200 OK { valid: true, username: "john.doe" }
4. setUser(data)
5. loading = false
6. ✅ Dashboard wordt getoond (GEEN redirect)
```

**Verificatie:**
```bash
# Browser console:
"Auth validate succesvol: john.doe"

# Network tab:
GET /api/auth/validate
Status: 200 OK
Cookie: eusuite_token=<JWT>
```

---

### Test 2: Niet ingelogde gebruiker

**Setup:**
- Geen cookie aanwezig
- User navigeert direct naar Dashboard

**Verwacht gedrag:**
```
1. Dashboard mount → useAuth() → validateAuth()
2. GET /api/auth/validate zonder cookie
3. Response: 401 Unauthorized
4. ✅ Redirect naar login?redirect=/dashboard
```

**Verificatie:**
```bash
# Browser console:
"401 Unauthorized - Gebruiker niet ingelogd, redirect naar login"

# Browser URL changes to:
http://192.168.124.50:30090/login?redirect=%2Fdashboard
```

---

### Test 3: Backend tijdelijk down (502)

**Setup:**
- Backend is down of reageert met 502
- User probeert dashboard te openen

**Verwacht gedrag:**
```
1. Dashboard mount → useAuth() → validateAuth()
2. GET /api/auth/validate
3. Response: 502 Bad Gateway
4. ❌ GEEN redirect
5. Error message: "Backend error: 502 Bad Gateway"
6. loading = false
7. Dashboard blijft op 30091 (geen redirect loop)
```

**Verificatie:**
```bash
# Browser console:
"Backend error: 502 Bad Gateway"

# Browser URL blijft:
http://192.168.124.50:30091/dashboard
(GEEN redirect naar login)
```

---

### Test 4: Network timeout

**Setup:**
- Backend reageert niet (timeout na 30s)
- User probeert dashboard te openen

**Verwacht gedrag:**
```
1. Dashboard mount → useAuth() → validateAuth()
2. GET /api/auth/validate
3. Request timeout (catch block)
4. ❌ GEEN redirect
5. Error: "Network error" of "Failed to fetch"
6. loading = false
7. User kan retry
```

**Verificatie:**
```bash
# Browser console:
"Validate request failed (network/timeout): Failed to fetch"

# Browser URL blijft:
http://192.168.124.50:30091
(GEEN redirect loop)
```

---

## 📊 Redirect Decision Tree

```
GET /api/auth/validate
    │
    ├─ HTTP 401?
    │   └─ YES → ✅ REDIRECT naar login
    │
    ├─ HTTP 200?
    │   ├─ data.valid === true?
    │   │   └─ YES → ✅ Set user, show dashboard
    │   └─ NO → ❌ Error, GEEN redirect
    │
    ├─ HTTP 500/502/503?
    │   └─ ❌ Error log, GEEN redirect
    │
    └─ Network error (timeout/CORS/DNS)?
        └─ ❌ Error log, GEEN redirect
```

---

## 🔐 Cookie Verificatie

### Constants Check

`src/config/constants.ts`:
```typescript
export const API_BASE_URL = 'http://192.168.124.50:30500'; // ✅ Port 30500
export const LOGIN_URL = 'http://192.168.124.50:30090/login'; // ✅ Port 30090
```

**✅ Correct:** 
- Dashboard (30091) → Backend (30500) voor validate
- Dashboard (30091) → Login (30090) voor redirect
- **NOOIT** fetch naar `30091/api/auth/...`

### Credentials Check

```typescript
const response = await fetch(`${API_BASE_URL}/api/auth/validate`, {
  method: 'GET',
  credentials: 'include', // ✅ Stuurt cookie mee
});
```

**✅ Correct:** `credentials: "include"` zorgt dat `eusuite_token` cookie wordt meegestuurd.

---

## 📦 Files Changed

| File | Change | Reason |
|------|--------|--------|
| `src/hooks/useAuth.ts` | ✅ Refactored | Only redirect on 401, not on other errors |
| `src/components/Layout.tsx` | ✅ No change | Already correct (geen vroege redirect) |
| `src/config/constants.ts` | ✅ No change | Already correct (port 30500) |

---

## ✅ Checklist

- [x] Redirect **ALLEEN** bij HTTP 401
- [x] **GEEN** redirect bij network errors
- [x] **GEEN** redirect bij 500/502/503 errors
- [x] **GEEN** redirect bij timeout
- [x] **GEEN** redirect bij CORS issues
- [x] `credentials: "include"` correct
- [x] `API_BASE_URL` verwijst naar port 30500
- [x] `LOGIN_URL` verwijst naar port 30090
- [x] Layout doet **geen** vroege redirect
- [x] Loading state behouden
- [x] Logout nog steeds werkend
- [x] Console logging voor debugging

---

## 🎯 Resultaat

**Voor de fix:**
- ❌ Oneindige redirect loops
- ❌ Gebruiker wordt naar login gestuurd zelfs als al ingelogd
- ❌ Dashboard onbruikbaar bij backend delays

**Na de fix:**
- ✅ Redirect **alleen** bij echte 401 (niet ingelogd)
- ✅ Gebruiker blijft op dashboard bij network errors
- ✅ Error messages in plaats van redirects bij technische fouten
- ✅ Geen redirect loops meer
- ✅ Dashboard werkt zelfs als backend tijdelijk down is

---

**Status:** ✅ **FIXED & DEPLOYED**

Commit: `c58f267` - "Fix SSO redirect loop - only redirect on 401, not on network errors"
