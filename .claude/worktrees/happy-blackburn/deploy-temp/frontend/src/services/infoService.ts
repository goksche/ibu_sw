// Info Service
import api from './api';

export interface AppInfo {
  version: string;
  name: string;
}

export const infoService = {
  // Get application version
  async getVersion(): Promise<AppInfo> {
    const response = await api.get<AppInfo>('/info/version');
    return response.data;
  },
};


