import api from './api';
import { AppSettings } from '../types';

export const DEFAULT_APP_SETTINGS: AppSettings = {
  live_ticker: {
    slide_duration_sec: 20,
    refresh_interval_sec: 20,
    slide_order: ['groups', 'qualification', 'ko'],
    slides_enabled: {
      groups: true,
      qualification: true,
      ko: true,
    },
    only_running_group_matches: false,
    show_spielfeld: true,
    show_results: true,
    mark_decision_matches: true,
    max_groups_per_slide: 1,
  },
  dashboard: {
    default_sort: 'date',
  },
  placeholders: {
    language: 'de-CH',
    timezone: 'Europe/Zurich',
    layout: 'standard',
    font_family: 'Source Sans 3',
  },
};

export const settingsService = {
  async getSettings(): Promise<AppSettings> {
    const response = await api.get<AppSettings>('/settings');
    return response.data;
  },

  async updateSettings(payload: AppSettings): Promise<AppSettings> {
    const response = await api.put<AppSettings>('/settings', payload);
    return response.data;
  },
};
