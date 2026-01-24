// Auth Context - Manages user authentication and role state
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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

    // For now, create a simple user object from the token
    // In a real app, this would validate the token and load user data
    try {
      const token = authService.getToken();
      if (token) {
        // Decode token to get user info (simple decode, not secure)
        let payload;
        try {
          // Try JWT format first
          payload = JSON.parse(atob(token.split('.')[1]));
        } catch {
          // If JWT decoding fails, try direct base64 decode (for mock tokens)
          try {
            payload = JSON.parse(atob(token));
          } catch {
            // If all decoding fails, create mock user data
            console.log('Using mock user data for development');
            payload = {
              sub: 'goksche',
              user_id: 1,
              role: 'admin',
              exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
            };
          }
        }
        console.log('Token payload:', payload);

        // Check if token is expired
        const currentTime = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < currentTime) {
          console.log('Token expired, logging out');
          authService.logout();
          setUser(null);
        } else {
          // Create a simple user object
          const userData = {
            id: payload.user_id || 1,
            username: payload.sub || 'admin',
            email: 'admin@localhost',
            role: payload.role || 'admin',
            is_active: true,
            app_permissions: []
          };
          console.log('Setting user data:', userData);
          setUser(userData);
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to decode token:', error);
      // For development, create a default admin user instead of logging out
      console.log('Creating default admin user for development');
      const userData = {
        id: 1,
        username: 'goksche',
        email: 'goksche23@gmail.com',
        role: 'admin',
        is_active: true,
        created_at: new Date(),
        app_permissions: []
      };
      setUser(userData);
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
