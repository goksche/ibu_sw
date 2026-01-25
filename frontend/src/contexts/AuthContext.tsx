// Auth Context - Manages user authentication and role state
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authService } from '../services/authService';
import { UserWithPermissions } from '../types';

interface AuthContextType {
  user: UserWithPermissions | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isUser: boolean;
  isViewer: boolean;
  canEdit: boolean; // USER or ADMIN can edit
  refreshUser: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserWithPermissions | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = async () => {
    if (!authService.isAuthenticated()) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      // Validate token first
      const isValid = await authService.validateToken();
      if (!isValid) {
        authService.logout();
        setUser(null);
        setLoading(false);
        return;
      }

      // Load user data from backend
      const userData = await authService.getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error('Failed to load user:', error);
      authService.logout();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  const refreshUser = async () => {
    await loadUser();
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const isAuthenticated = !!user;
  const isAdmin = user?.role === 'admin';
  const isUser = user?.role === 'user';
  const isViewer = user?.role === 'viewer';
  const canEdit = isAdmin || isUser; // USER or ADMIN can edit

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated,
        isAdmin,
        isUser,
        isViewer,
        canEdit,
        refreshUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
