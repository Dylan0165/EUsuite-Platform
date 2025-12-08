import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL, LOGIN_URL } from '../config/constants';
import type { User } from '../types/auth';

// Dashboard base URL
const DASHBOARD_BASE_URL = 'http://192.168.124.50:30091';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getRedirectUrl = useCallback(() => {
    // Build full URL with Dashboard base
    return DASHBOARD_BASE_URL + window.location.pathname + window.location.search;
  }, []);

  const redirectToLogin = useCallback(() => {
    const redirectUrl = getRedirectUrl();
    window.location.href = `${LOGIN_URL}?redirect=${encodeURIComponent(redirectUrl)}`;
  }, [getRedirectUrl]);

  const validateAuth = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // ✅ Fetch naar backend op port 30500
      const response = await fetch(`${API_BASE_URL}/api/auth/validate`, {
        method: 'GET',
        credentials: 'include', // ✅ Stuurt eusuite_token cookie mee
      });

      // ✅ ALLEEN bij 401 redirect naar login
      if (response.status === 401) {
        console.log('Dashboard: 401 Unauthorized - redirecting to login');
        setUser(null);
        setError('Not authenticated');
        redirectToLogin();
        return;
      }

      // ✅ Bij andere fouten (500, 502, 503, etc): GEEN redirect
      if (!response.ok) {
        const errorMsg = `Backend error: ${response.status} ${response.statusText}`;
        console.error('Dashboard:', errorMsg);
        setError(errorMsg);
        setUser(null);
        setLoading(false);
        return;
      }

      // ✅ Response OK (200) - Parse JSON en valideer user data
      const data = await response.json();
      
      if (data.valid) {
        // Handle both response formats (user object or top-level fields)
        const userData = data.user || { 
          username: data.username, 
          email: data.email || '',
          user_id: data.user_id 
        };
        
        if (userData.username || userData.email) {
          console.log('Dashboard: Auth validate successful:', userData.username || userData.email);
          setUser({ 
            username: userData.username, 
            email: userData.email || '' 
          });
          setError(null);
        } else {
          console.warn('Dashboard: Invalid user data, redirecting');
          setUser(null);
          setError('Invalid response from backend');
          redirectToLogin();
        }
      } else {
        console.warn('Dashboard: Validate response valid=false, redirecting');
        setUser(null);
        setError('Session not valid');
        redirectToLogin();
      }

    } catch (err) {
      // ✅ Network errors, timeouts, CORS, JSON parse errors
      // GEEN redirect - dit zijn technische fouten
      const errorMsg = err instanceof Error ? err.message : 'Network error';
      console.error('Dashboard: Validate request failed (network/timeout):', errorMsg);
      setError(errorMsg);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [redirectToLogin]);

  const logout = useCallback(async () => {
    try {
      console.log('Dashboard: Logging out...');
      
      // POST naar logout endpoint
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
      
      setUser(null);
      
      // ✅ Na logout redirect naar login met dashboard als target
      window.location.href = `${LOGIN_URL}?redirect=${encodeURIComponent(DASHBOARD_BASE_URL + '/dashboard')}`;
    } catch (err) {
      console.error('Dashboard: Logout request failed:', err);
      
      // ✅ Ook bij logout fout: toch redirect naar login
      setUser(null);
      window.location.href = LOGIN_URL;
    }
  }, []);

  useEffect(() => {
    validateAuth();
  }, [validateAuth]);

  return { 
    user, 
    loading, 
    error, 
    logout, 
    refetch: validateAuth 
  };
};
