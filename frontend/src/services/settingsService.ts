import api from './api';
import { AppSettings } from '../types';
import { formatApiErrorMessage } from '../utils/apiErrors';

export interface UserSettings {
  layout: 'standard' | 'neon' | 'neon_yellow' | 'neon_cyan' | 'neon_blue' | 'arena' | 'gsmartsol';
  font_family: string;
  dashboard_sort: 'date' | 'name' | 'status';
  language: string;
  timezone: string;
}

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

export const DEFAULT_USER_SETTINGS: UserSettings = {
  layout: 'standard',
  font_family: 'Source Sans 3',
  dashboard_sort: 'date',
  language: 'de-CH',
  timezone: 'Europe/Zurich',
};

const ALLOWED_LAYOUTS: UserSettings['layout'][] = [
  'standard',
  'neon',
  'neon_yellow',
  'neon_cyan',
  'neon_blue',
  'arena',
  'gsmartsol',
];

function normalizeUserSettingsPayload(payload: UserSettings): UserSettings {
  const normalizedLayout = ALLOWED_LAYOUTS.includes(payload.layout) ? payload.layout : 'standard';
  return {
    ...payload,
    layout: normalizedLayout,
    font_family: payload.font_family || DEFAULT_USER_SETTINGS.font_family,
    dashboard_sort: payload.dashboard_sort || DEFAULT_USER_SETTINGS.dashboard_sort,
    language: payload.language || DEFAULT_USER_SETTINGS.language,
    timezone: payload.timezone || DEFAULT_USER_SETTINGS.timezone,
  };
}

export function extractApiErrorDetail(error: unknown): string | null {
  const s = formatApiErrorMessage(error, '');
  return s || null;
}

export const settingsService = {
  // Global settings (backward-compatible)
  async getSettings(): Promise<AppSettings> {
    const response = await api.get<AppSettings>('/settings');
    return response.data;
  },

  async updateSettings(payload: AppSettings): Promise<AppSettings> {
    const response = await api.put<AppSettings>('/settings', payload);
    return response.data;
  },

  // Global settings (explicit endpoints)
  async getGlobalSettings(): Promise<AppSettings> {
    const response = await api.get<AppSettings>('/settings/global');
    return response.data;
  },

  async updateGlobalSettings(payload: AppSettings): Promise<AppSettings> {
    const response = await api.put<AppSettings>('/settings/global', payload);
    return response.data;
  },

  // User-individual settings
  async getUserSettings(): Promise<UserSettings> {
    const response = await api.get<UserSettings>('/settings/user');
    return response.data;
  },

  async updateUserSettings(payload: UserSettings): Promise<UserSettings> {
    const response = await api.put<UserSettings>('/settings/user', normalizeUserSettingsPayload(payload));
    return response.data;
  },
};
