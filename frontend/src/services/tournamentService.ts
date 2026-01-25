// Tournament Service
import api from './api';
import { Tournament } from '../types';

export const tournamentService = {
  // Get all tournaments
  async getAll(): Promise<Tournament[]> {
    const response = await api.get<Tournament[]>('/tournaments');
    return response.data;
  },

  // Get tournament by ID
  async getById(id: number): Promise<Tournament> {
    const response = await api.get<Tournament>(`/tournaments/${id}`);
    return response.data;
  },

  // Create tournament
  async create(data: Partial<Tournament>): Promise<Tournament> {
    const response = await api.post<Tournament>('/tournaments', data);
    return response.data;
  },

  // Update tournament
  async update(id: number, data: Partial<Tournament>): Promise<Tournament> {
    const response = await api.put<Tournament>(`/tournaments/${id}`, data);
    return response.data;
  },

  // Delete tournament
  async delete(id: number): Promise<void> {
    await api.post(`/tournaments/${id}/delete`);
  },

  // Generate groups
  async generateGroups(id: number): Promise<{message: string, groups_created: number, participants_assigned: number, distribution_method: string}> {
    const response = await api.post<{message: string, groups_created: number, participants_assigned: number, distribution_method: string}>(
      `/tournaments/${id}/generate-groups`
    );
    return response.data;
  },

  // Generate Round Robin matches
  async generateRoundRobin(id: number): Promise<{message: string, groups_processed: number, matches_created: number}> {
    const response = await api.post<{message: string, groups_processed: number, matches_created: number}>(
      `/tournaments/${id}/generate-round-robin`
    );
    return response.data;
  },

  // Generate KO Bracket
  async generateKOBracket(id: number): Promise<{message: string, matches_created: number, first_round_size: number, mode: string}> {
    const response = await api.post<{message: string, matches_created: number, first_round_size: number, mode: string}>(
      `/tournaments/${id}/generate-ko-bracket`
    );
    return response.data;
  },

  // Create manual KO bracket
  async createManualKOBracket(
    id: number,
    pairs: Array<{ player1_id: number | null; player2_id: number | null; }>
  ): Promise<{message: string, matches_created: number, bracket_size: number, mode: string}> {
    const response = await api.post<{message: string, matches_created: number, bracket_size: number, mode: string}>(
      `/tournaments/${id}/manual-ko-bracket`,
      { pairs }
    );
    return response.data;
  },

  // Duplicate tournament
  async duplicate(id: number): Promise<Tournament> {
    const response = await api.post<Tournament>(`/tournaments/${id}/duplicate`);
    return response.data;
  },

  // Set tournament as template
  async setAsTemplate(id: number, isTemplate: boolean): Promise<Tournament> {
    const response = await api.post<Tournament>(`/tournaments/${id}/set-template`, null, {
      params: { is_template: isTemplate }
    });
    return response.data;
  },

  // Get templates
  async getTemplates(): Promise<Tournament[]> {
    try {
      const response = await api.get<Tournament[]>('/tournaments/templates');
      return response.data;
    } catch (err: any) {
      throw err;
    }
  },

  // Set seeded participants
  async setSeededParticipants(id: number, participantIds: number[]): Promise<Tournament> {
    const response = await api.post<Tournament>(`/tournaments/${id}/set-seeded-participants`, participantIds);
    return response.data;
  },

  // Get seeded participants
  async getSeededParticipants(id: number): Promise<{tournament_id: number, seeded_participant_ids: number[]}> {
    const response = await api.get<{tournament_id: number, seeded_participant_ids: number[]}>(`/tournaments/${id}/seeded-participants`);
    return response.data;
  },
};

