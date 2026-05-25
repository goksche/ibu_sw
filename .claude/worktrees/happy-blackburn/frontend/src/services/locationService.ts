import api from './api';
import { Location, Spielfeld } from '../types';

export const locationService = {
  async getAll(): Promise<Location[]> {
    const response = await api.get<Location[]>('/locations');
    return response.data;
  },

  async getById(id: number): Promise<Location> {
    const response = await api.get<Location>(`/locations/${id}`);
    return response.data;
  },

  async create(data: { name: string }): Promise<Location> {
    const response = await api.post<Location>('/locations', data);
    return response.data;
  },

  async update(id: number, data: { name?: string }): Promise<Location> {
    const response = await api.put<Location>(`/locations/${id}`, data);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/locations/${id}`);
  },

  async addSpielfeld(locationId: number, data: { name: string; sort_order?: number }): Promise<Spielfeld> {
    const response = await api.post<Spielfeld>(`/locations/${locationId}/spielfelder`, {
      name: data.name,
      sort_order: data.sort_order ?? 0,
    });
    return response.data;
  },

  async updateSpielfeld(spielfeldId: number, data: { name?: string; sort_order?: number }): Promise<Spielfeld> {
    const response = await api.put<Spielfeld>(`/locations/spielfelder/${spielfeldId}`, data);
    return response.data;
  },

  async deleteSpielfeld(spielfeldId: number): Promise<void> {
    await api.delete(`/locations/spielfelder/${spielfeldId}`);
  },
};
