import { useState, useEffect, useCallback } from 'react';
import { CORE_VALIDATE_URL, LOGIN_URL } from '../config/constants';

// EUMail base URL for redirect after login
const EUMAIL_BASE_URL = 'http://192.168.124.50:30082';

interface User {
  user_id: string;
  email: string;
  username?: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getRedirectUrl = useCallback(() => {
    // Build full URL with EUMail base
    return EUMAIL_BASE_URL + window.location.pathname + window.location.search;
  }, []);

  const redirectToLogin = useCallback(() => {
    const redirectUrl = getRedirectUrl();
    // Include redirect parameter so login knows where to send user back
    window.location.href = `${LOGIN_URL}?redirect=${encodeURIComponent(redirectUrl)}`;
  }, [getRedirectUrl]);

  const validateSession = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(CORE_VALIDATE_URL, {
        method: 'GET',
        credentials: 'include',
      });

      // Only redirect on 401 Unauthorized
      if (response.status === 401) {
        console.log('EUMail: 401 Unauthorized - redirecting to login');
        setUser(null);
        setError('Not authenticated');
        redirectToLogin();
        return;
      }

      // On other errors (500, 502, etc): don't redirect, show error
      if (!response.ok) {
        const errorMsg = `Backend error: ${response.status} ${response.statusText}`;
        console.error('EUMail:', errorMsg);
        setError(errorMsg);
        setUser(null);
        setLoading(false);
        return;
      }

      // Response OK - parse user data
      const data = await response.json();
      
      if (data.valid) {
        setUser({
          user_id: data.user_id || data.user?.user_id || data.id,
          email: data.email || data.user?.email,
          username: data.username || data.user?.username,
        });
      } else {
        // Valid response but not authenticated
        redirectToLogin();
      }
    } catch (error) {
      console.error('Auth validation failed:', error);
      setError('Connection error');
      // Don't redirect on network errors - might be temporary
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [redirectToLogin]);

  useEffect(() => {
    validateSession();
  }, [validateSession]);

  return { user, loading, error, validateSession };
}
