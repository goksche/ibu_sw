import api from './api';
import {
  PageViewLog,
  LoginEventLog,
  ApiRequestLog,
  AdminActionLog,
  NginxLogResponse
} from '../types';

export interface LogQueryParams {
  skip?: number;
  limit?: number;
  q?: string;
  user_id?: number;
  start?: string;
  end?: string;
  status_code?: number;
}

export const logsService = {
  async trackPageView(payload: {
    path: string;
    query?: string | null;
    referrer?: string | null;
    title?: string | null;
  }): Promise<PageViewLog | null> {
    try {
      const response = await api.post<PageViewLog>('/logs/page-views', payload);
      return response.data;
    } catch {
      return null;
    }
  },

  async getPageViews(params: LogQueryParams = {}): Promise<PageViewLog[]> {
    const response = await api.get<PageViewLog[]>('/platform/admin/logs/page-views', { params });
    return response.data;
  },

  async getLoginEvents(params: LogQueryParams = {}): Promise<LoginEventLog[]> {
    const response = await api.get<LoginEventLog[]>('/platform/admin/logs/login-events', { params });
    return response.data;
  },

  async getApiRequests(params: LogQueryParams = {}): Promise<ApiRequestLog[]> {
    const response = await api.get<ApiRequestLog[]>('/platform/admin/logs/api-requests', { params });
    return response.data;
  },

  async getAdminActions(params: LogQueryParams = {}): Promise<AdminActionLog[]> {
    const response = await api.get<AdminActionLog[]>('/platform/admin/logs/admin-actions', { params });
    return response.data;
  },

  async getNginxLogs(tail: number = 200): Promise<NginxLogResponse> {
    const response = await api.get<NginxLogResponse>('/platform/admin/logs/nginx', { params: { tail } });
    return response.data;
  }
};
