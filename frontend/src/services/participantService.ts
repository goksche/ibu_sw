// Participant Service
import api from './api';
import { Participant } from '../types';

export type ParticipantImportResult = {
  imported: number;
  skipped: number;
  errors: string[];
  skipped_items?: Array<{
    row: number;
    name: string;
    scolia_id?: string;
    reason: string;
  }>;
};

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

  /** CSV-Import (gleiche baseURL/Proxy wie alle anderen API-Calls) */
  async importCsv(file: File): Promise<ParticipantImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<ParticipantImportResult>('/participants/import', formData);
    return response.data;
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

  async addManualTournamentParticipant(tournamentId: number, data: Partial<Participant>): Promise<Participant> {
    const response = await api.post<Participant>(`/participants/tournament/${tournamentId}/add-manual`, data);
    return response.data;
  },
};

