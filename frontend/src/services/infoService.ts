import api from './api';

export type AppDiagnostics = {
  version: string;
  name: string;
  debug: boolean;
  deploy_label: string | null;
  database: string;
};

export type AppVersionInfo = {
  version: string;
  name: string;
};

export const infoService = {
  async getVersion(): Promise<AppVersionInfo> {
    const response = await api.get<AppVersionInfo>('/info/version');
    return response.data;
  },

  async getDiagnostics(): Promise<AppDiagnostics> {
    const response = await api.get<AppDiagnostics>('/info/diagnostics');
    return response.data;
  },
};
