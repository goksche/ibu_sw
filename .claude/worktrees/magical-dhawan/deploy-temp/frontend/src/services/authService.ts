// Authentication Service
import api from './api';
import { LoginCredentials, RegisterData, AuthResponse, User, UserWithPermissions } from '../types';

// Token refresh interval (25 minutes, tokens expire after 30 minutes)
const TOKEN_REFRESH_INTERVAL = 25 * 60 * 1000;
let refreshTimer: NodeJS.Timeout | null = null;

export const authService = {
  // Login
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', credentials);
    if (response.data.access_token) {
      localStorage.setItem('token', response.data.access_token);
      this.startTokenRefresh();
    }
    return response.data;
  },

  // Register
  async register(data: RegisterData): Promise<User> {
    const response = await api.post<User>('/auth/register', data);
    return response.data;
  },

  // Logout
  logout(): void {
    localStorage.removeItem('token');
    this.stopTokenRefresh();
  },

  // Get current token
  getToken(): string | null {
    return localStorage.getItem('token');
  },

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.getToken();
  },

  // Get current user with permissions
  async getCurrentUser(): Promise<UserWithPermissions> {
    const response = await api.get<UserWithPermissions>('/auth/me');
    return response.data;
  },

  // Refresh token
  async refreshToken(): Promise<AuthResponse> {
    const token = this.getToken();
    if (!token) {
      throw new Error('No token to refresh');
    }
    
    const response = await api.post<AuthResponse>('/auth/refresh', {
      access_token: token
    });
    
    if (response.data.access_token) {
      localStorage.setItem('token', response.data.access_token);
    }
    
    return response.data;
  },

  // Validate token
  async validateToken(): Promise<boolean> {
    const token = this.getToken();
    if (!token) {
      return false;
    }
    
    try {
      const response = await api.post<{ valid: boolean }>('/auth/validate', {
        access_token: token
      });
      return response.data.valid;
    } catch {
      return false;
    }
  },

  // Start automatic token refresh
  startTokenRefresh(): void {
    this.stopTokenRefresh(); // Clear any existing timer
    
    refreshTimer = setInterval(async () => {
      try {
        await this.refreshToken();
      } catch (error) {
        console.error('Token refresh failed:', error);
        // If refresh fails, user will need to login again
        this.logout();
      }
    }, TOKEN_REFRESH_INTERVAL);
  },

  // Stop automatic token refresh
  stopTokenRefresh(): void {
    if (refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }
  },
};

