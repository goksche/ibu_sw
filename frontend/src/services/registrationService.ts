import api from './api';

export interface RegistrationRequest {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  status: 'pending' | 'approved' | 'rejected';
  otp_verified: boolean;
  invitation_tournament_id: number | null;
  invitation_league_id: number | null;
  reviewed_by: number | null;
  reviewed_at: string | null;
  reject_reason: string | null;
  created_at: string;
  updated_at: string;
}

export const registrationService = {
  async register(data: { email: string; first_name: string; last_name?: string }): Promise<{ message: string; dev_otp_code?: string }> {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  async verifyOTP(email: string, otp_code: string): Promise<{ message: string }> {
    const response = await api.post('/auth/register/verify-otp', { email, otp_code });
    return response.data;
  },

  async getAll(): Promise<RegistrationRequest[]> {
    const response = await api.get<RegistrationRequest[]>('/auth/admin/registrations');
    return response.data;
  },

  async approve(id: number, opts?: { forceUnverified?: boolean }): Promise<RegistrationRequest> {
    const params =
      opts?.forceUnverified === true ? { force_unverified: true } : undefined;
    const response = await api.post<RegistrationRequest>(
      `/auth/admin/registrations/${id}/approve`,
      undefined,
      { params }
    );
    return response.data;
  },

  async reject(id: number, reason?: string): Promise<RegistrationRequest> {
    const response = await api.post<RegistrationRequest>(`/auth/admin/registrations/${id}/reject`, { reason });
    return response.data;
  },

  async remove(id: number): Promise<void> {
    await api.delete(`/auth/admin/registrations/${id}`);
  },
};
