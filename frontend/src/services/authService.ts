// Authentication Service
import api from './api';
import { LoginCredentials, AuthResponse, User, UserWithPermissions, UserRole } from '../types';

// Token refresh interval (25 minutes, tokens expire after 30 minutes)
const TOKEN_REFRESH_INTERVAL = 25 * 60 * 1000;
let refreshTimer: ReturnType<typeof setInterval> | null = null;

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

  // Simple login for development (will be replaced with OTP later)
  async login(credentials: { username: string; password: string }): Promise<AuthResponse> {
    // For development, accept any username/password combination and return a mock token
    // In production, this would authenticate against the backend

    // Mock authentication - accept test credentials
    const validCredentials = [
      { username: 'goksche', password: 'admin123', role: 'admin' },
      { username: 'user', password: 'user123', role: 'user' },
      { username: 'viewer', password: 'viewer123', role: 'viewer' }
    ];

    const user = validCredentials.find(
      cred => cred.username === credentials.username && cred.password === credentials.password
    );

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Create a mock JWT token
    const mockToken = btoa(JSON.stringify({
      sub: user.username,
      user_id: user.username === 'goksche' ? 1 : user.username === 'user' ? 2 : 3,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    }));

    localStorage.setItem('token', mockToken);
    this.startTokenRefresh();

    return {
      access_token: mockToken,
      token_type: 'bearer'
    };
  },

  // User Management (Admin only)
  async getUsers(): Promise<User[]> {
    const response = await api.get<User[]>('/auth/users');
    return response.data;
  },

  async createUser(userData: {
    username: string;
    email: string;
    password: string;
    role: UserRole;
    is_active?: boolean;
  }): Promise<User> {
    const response = await api.post<User>('/auth/users', userData);
    return response.data;
  },

  async updateUser(userId: number, userData: {
    username: string;
    email: string;
    password?: string;
    role: UserRole;
    is_active?: boolean;
  }): Promise<User> {
    const response = await api.put<User>(`/auth/users/${userId}`, userData);
    return response.data;
  },

  async deleteUser(userId: number): Promise<void> {
    await api.delete(`/auth/users/${userId}`);
  },
};

