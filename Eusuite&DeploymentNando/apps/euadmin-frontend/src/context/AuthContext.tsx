import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { adminApi } from '../api/client';

interface AuthContextType {
  isAuthenticated: boolean;
  adminEmail: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if we have a token stored
    const token = localStorage.getItem('admin_token');
    if (token) {
      // Validate the token
      adminApi.validateToken()
        .then((response) => {
          if (response.valid) {
            setIsAuthenticated(true);
            setAdminEmail(response.email || null);
          } else {
            localStorage.removeItem('admin_token');
          }
        })
        .catch(() => {
          localStorage.removeItem('admin_token');
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await adminApi.login(email, password);
      localStorage.setItem('admin_token', response.access_token);
      setIsAuthenticated(true);
      setAdminEmail(response.admin_email);
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    setIsAuthenticated(false);
    setAdminEmail(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, adminEmail, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
