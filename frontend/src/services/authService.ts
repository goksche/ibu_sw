// Authentication Service
import api from './api';
import { AuthResponse, LoginCredentials, User, UserWithPermissions } from '../types';

export type UserRole = 'admin' | 'user' | 'viewer';

// Token refresh interval (9 hours, tokens expire after 10 hours)
const TOKEN_REFRESH_INTERVAL = 9 * 60 * 60 * 1000;
let refreshTimer: ReturnType<typeof setInterval> | null = null;

export const authService = {
  // OTP: Send code to email (whitelist required)
  async sendOTP(email: string): Promise<{ message: string; dev_otp_code?: string }> {
    const response = await api.post('/auth/send-otp', { email });
    return response.data;
  },

  // OTP: Verify code and get token
  async verifyOTP(email: string, otpCode: string): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/verify-otp', {
      email,
      otp_code: otpCode,
    });
    if (response.data.access_token) {
      localStorage.setItem('token', response.data.access_token);
      this.startTokenRefresh();
    }
    return response.data;
  },

  // Login (real backend)
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await api.post<AuthResponse>('/auth/login', credentials);
      if (response.data.access_token) {
        localStorage.setItem('token', response.data.access_token);
        this.startTokenRefresh();
      }
      return response.data;
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.response?.data?.detail || 'Login fehlgeschlagen');
    }
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
      access_token: token,
    });

    if (response.data.access_token) {
      localStorage.setItem('token', response.data.access_token);
    }

    return response.data;
  },

  // Validate token
  async validateToken(): Promise<boolean> {
    const token = this.getToken();
    if (!token) return false;

    try {
      const response = await api.post<{ valid: boolean }>('/auth/validate', {
        access_token: token,
      });
      return response.data.valid;
    } catch {
      return false;
    }
  },

  // Start automatic token refresh
  startTokenRefresh(): void {
    this.stopTokenRefresh();

    refreshTimer = setInterval(async () => {
      try {
        await this.refreshToken();
      } catch (error) {
        console.error('Token refresh failed:', error);
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

  // User Management (Admin only)
  async getUsers(): Promise<User[]> {
    const response = await api.get<User[]>('/auth/users');
    return response.data;
  },

  async createUser(userData: {
    email: string;
    role: UserRole;
  }): Promise<User> {
    const response = await api.post<User>('/auth/users', userData);
    return response.data;
  },

  async updateUser(
    userId: number,
    userData: {
      email?: string;
      role?: UserRole;
      is_active?: boolean;
    }
  ): Promise<User> {
    const response = await api.put<User>(`/auth/users/${userId}`, userData);
    return response.data;
  },

  async deleteUser(userId: number): Promise<void> {
    await api.delete(`/auth/users/${userId}`);
  },
};