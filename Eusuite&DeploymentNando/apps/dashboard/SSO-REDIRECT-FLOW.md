# SSO Redirect Flow - Complete Implementatie

## 📋 Overzicht

Dit document beschrijft de complete SSO redirect flow tussen het EUsuite Dashboard en het Login Portal.

## 🔄 Flow Diagram

```
User → Dashboard (no cookie) 
    ↓
Dashboard redirect → Login Portal?redirect=/dashboard
    ↓
User logs in → Login POST to backend
    ↓
Backend sets cookie → Response success
    ↓
Login Frontend → Redirect to /dashboard
    ↓
Dashboard validates cookie → Show Dashboard
```

## 1️⃣ Dashboard Side (ALREADY IMPLEMENTED ✅)

### useAuth Hook (`src/hooks/useAuth.ts`)

**Bij validate failure:**
```typescript
// Captures current path and redirects to login
const redirectPath = window.location.pathname + window.location.search;
const redirectUrl = redirectPath === '/' ? '/dashboard' : redirectPath;
window.location.href = `${LOGIN_URL}?redirect=${encodeURIComponent(redirectUrl)}`;
```

**Bij logout:**
```typescript
// Redirects to login with dashboard as default
window.location.href = `${LOGIN_URL}?redirect=${encodeURIComponent('/dashboard')}`;
```

## 2️⃣ Login Frontend Side (TO IMPLEMENT IN LOGIN PROJECT)

### Login Component - Complete Implementation

```typescript
// src/pages/Login.tsx (in Login Portal project)
import { useState, useEffect } from 'react';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState('/dashboard');

  // Extract redirect parameter from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get('redirect');
    if (redirect) {
      setRedirectUrl(redirect);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://192.168.124.50:30500/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // IMPORTANT: Set cookie
        body: JSON.stringify({
          username,
          password,
          redirect: redirectUrl, // Send redirect to backend (optional)
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Success! Cookie is set, redirect to target
        console.log('Login successful, redirecting to:', redirectUrl);
        
        // Construct full URL for redirect
        const baseUrl = 'http://192.168.124.50:30091'; // Dashboard URL
        window.location.href = `${baseUrl}${redirectUrl}`;
      } else {
        const data = await response.json();
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h2 className="text-2xl font-bold mb-6 text-center">EUsuite Login</h2>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        {/* Show redirect destination for debugging */}
        {redirectUrl !== '/dashboard' && (
          <p className="mt-4 text-sm text-gray-600 text-center">
            You will be redirected to: {redirectUrl}
          </p>
        )}
      </div>
    </div>
  );
};

export default Login;
```

## 3️⃣ Backend API Contract (FOR REFERENCE)

### POST /api/auth/login

**Request:**
```json
{
  "username": "string",
  "password": "string",
  "redirect": "string (optional)"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "username": "string",
    "email": "string"
  }
}
```

**Sets Cookie:**
```
Set-Cookie: eusuite_token=<JWT_TOKEN>; Path=/; Domain=192.168.124.50; HttpOnly; SameSite=Lax
```

**Response (Failure - 401):**
```json
{
  "success": false,
  "message": "Invalid credentials"
}
```

### GET /api/auth/validate

**Request Headers:**
```
Cookie: eusuite_token=<JWT_TOKEN>
```

**Response (Valid - 200):**
```json
{
  "valid": true,
  "username": "string",
  "email": "string"
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

**Request Headers:**
```
Cookie: eusuite_token=<JWT_TOKEN>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Clears Cookie:**
```
Set-Cookie: eusuite_token=; Path=/; Domain=192.168.124.50; Expires=Thu, 01 Jan 1970 00:00:00 GMT
```

## 4️⃣ URL Examples

### Redirect from Dashboard to Login

**User visits Dashboard (no cookie):**
```
http://192.168.124.50:30091/profile
```

**Dashboard redirects to:**
```
http://192.168.124.50:30090/login?redirect=%2Fprofile
```

**After login, user lands on:**
```
http://192.168.124.50:30091/profile
```

### Redirect from specific route

**User visits:**
```
http://192.168.124.50:30091/settings
```

**Redirects to:**
```
http://192.168.124.50:30090/login?redirect=%2Fsettings
```

**After login:**
```
http://192.168.124.50:30091/settings
```

## 5️⃣ Testing Checklist

- [ ] Visit dashboard without cookie → redirects to login with `?redirect=/dashboard`
- [ ] Visit `/profile` without cookie → redirects to login with `?redirect=/profile`
- [ ] Login succeeds → redirects to `/profile`
- [ ] Visit `/settings` without cookie → redirects to login with `?redirect=/settings`
- [ ] Login succeeds → redirects to `/settings`
- [ ] Logout from dashboard → redirects to login with `?redirect=/dashboard`
- [ ] Cookie expiry → automatic redirect to login with current path

## 6️⃣ Security Considerations

### Validate Redirect URL (Backend/Frontend)

```typescript
// Whitelist of allowed redirect paths
const ALLOWED_REDIRECTS = [
  '/dashboard',
  '/profile',
  '/settings',
  '/eucloud',
  '/eutype'
];

function isValidRedirect(redirect: string): boolean {
  // Must start with /
  if (!redirect.startsWith('/')) return false;
  
  // No external URLs
  if (redirect.includes('://')) return false;
  
  // Check against whitelist (optional)
  return ALLOWED_REDIRECTS.some(allowed => redirect.startsWith(allowed));
}

// In login component
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const redirect = params.get('redirect') || '/dashboard';
  
  if (isValidRedirect(redirect)) {
    setRedirectUrl(redirect);
  } else {
    setRedirectUrl('/dashboard'); // Fallback
  }
}, []);
```

## 7️⃣ CORS Configuration (Backend)

Ensure backend allows credentials from dashboard domain:

```javascript
// Express.js example
app.use(cors({
  origin: [
    'http://192.168.124.50:30091', // Dashboard
    'http://192.168.124.50:30090', // Login
    'http://192.168.124.50:30080', // EUCloud
    'http://192.168.124.50:30081'  // EUType
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

## ✅ Summary

**Dashboard (This Project):**
- ✅ Automatically redirects to login with current path
- ✅ Validates auth on every route
- ✅ Handles logout with redirect

**Login Portal (Separate Project):**
- ⚠️ Must read `redirect` parameter from URL
- ⚠️ Must send to backend (optional)
- ⚠️ Must redirect to full Dashboard URL after successful login
- ⚠️ Must use `credentials: 'include'`

**Backend:**
- ✅ Sets cookie on login
- ✅ Validates cookie on /api/auth/validate
- ✅ Clears cookie on logout
- ⚠️ Must allow CORS with credentials from all frontend domains
