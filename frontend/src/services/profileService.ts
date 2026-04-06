import api from './api';

export interface UserProfile {
  id: number;
  user_id: number;
  display_name: string | null;
  club: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_private: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProfilePublic {
  user_id: number;
  display_name: string | null;
  club: string | null;
  bio: string | null;
  avatar_url: string | null;
}

export interface ParticipantMatch {
  participant_id: number;
  first_name: string;
  last_name: string;
  email: string | null;
  club: string | null;
  already_linked: boolean;
}

export const profileService = {
  async getMyProfile(): Promise<UserProfile> {
    const response = await api.get<UserProfile>('/profile/me');
    return response.data;
  },

  async updateMyProfile(data: {
    display_name?: string;
    club?: string;
    bio?: string;
    is_private?: boolean;
  }): Promise<UserProfile> {
    const response = await api.put<UserProfile>('/profile/me', data);
    return response.data;
  },

  async uploadAvatar(file: File): Promise<UserProfile> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<UserProfile>('/profile/me/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async deleteAvatar(): Promise<UserProfile> {
    const response = await api.delete<UserProfile>('/profile/me/avatar');
    return response.data;
  },

  async getPublicProfile(userId: number): Promise<ProfilePublic> {
    const response = await api.get<ProfilePublic>(`/profile/${userId}`);
    return response.data;
  },

  async checkParticipantMatch(): Promise<ParticipantMatch | null> {
    const response = await api.get<ParticipantMatch | null>('/profile/me/participant-match');
    return response.data;
  },

  async linkParticipant(participantId: number): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>(`/profile/me/link-participant/${participantId}`);
    return response.data;
  },

  async unlinkParticipant(): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>('/profile/me/unlink-participant');
    return response.data;
  },
};
