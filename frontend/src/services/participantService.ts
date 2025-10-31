// Participant Service
import api from './api';
import { Participant } from '../types';

export const participantService = {
  // Get all participants
  async getAll(): Promise<Participant[]> {
    const response = await api.get<Participant[]>('/participants');
    return response.data;
  },

  // Get participant by ID
  async getById(id: number): Promise<Participant> {
    const response = await api.get<Participant>(`/participants/${id}`);
    return response.data;
  },

  // Create participant
  async create(data: Partial<Participant>): Promise<Participant> {
    const response = await api.post<Participant>('/participants', data);
    return response.data;
  },

  // Update participant
  async update(id: number, data: Partial<Participant>): Promise<Participant> {
    const response = await api.put<Participant>(`/participants/${id}`, data);
    return response.data;
  },

  // Delete participant
  async delete(id: number): Promise<void> {
    await api.delete(`/participants/${id}`);
  },

  // Tournament participants
  async getTournamentParticipants(tournamentId: number): Promise<Participant[]> {
    const response = await api.get<Participant[]>(`/participants/tournament/${tournamentId}`);
    return response.data;
  },

  async addTournamentParticipants(tournamentId: number, participantIds: number[]): Promise<{message: string, added: number, skipped: number}> {
    const response = await api.post<{message: string, added: number, skipped: number}>(
      `/participants/tournament/${tournamentId}/add`,
      { participant_ids: participantIds }
    );
    return response.data;
  },

  async removeTournamentParticipant(tournamentId: number, participantId: number): Promise<void> {
    await api.delete(`/participants/tournament/${tournamentId}/${participantId}`);
  },
};

