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
    await api.delete(`/tournaments/${id}`);
  },
};

