import api from './api';
import { League } from '../types';

export const leagueService = {
  async getAll(): Promise<League[]> {
    const response = await api.get<League[]>('/leagues');
    return response.data;
  },

  async getById(id: number): Promise<League> {
    const response = await api.get<League>(`/leagues/${id}`);
    return response.data;
  },

  async create(data: Partial<League> & { participant_ids?: number[]; tournament_ids?: number[] }): Promise<League> {
    const response = await api.post<League>('/leagues', data);
    return response.data;
  },

  async update(id: number, data: Partial<League> & { participant_ids?: number[]; tournament_ids?: number[] }): Promise<League> {
    const response = await api.put<League>(`/leagues/${id}`, data);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/leagues/${id}`);
  },
};
