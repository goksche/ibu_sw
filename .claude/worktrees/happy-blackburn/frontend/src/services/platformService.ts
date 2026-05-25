// Platform Service
import api from './api';
import { App, Feedback, FeedbackComment } from '../types';

export const platformService = {
  // Dashboard
  async getDashboardApps(): Promise<App[]> {
    const response = await api.get<App[]>('/platform/dashboard/apps');
    return response.data;
  },

  async getAppDetails(appId: number): Promise<App> {
    const response = await api.get<App>(`/platform/app/${appId}`);
    return response.data;
  },

  // Admin - Users
  async getUsers(skip = 0, limit = 100) {
    const response = await api.get(`/platform/admin/users?skip=${skip}&limit=${limit}`);
    return response.data;
  },

  async createUser(userData: any) {
    const response = await api.post('/platform/admin/users', userData);
    return response.data;
  },

  async updateUser(userId: number, userData: any) {
    const response = await api.put(`/platform/admin/users/${userId}`, userData);
    return response.data;
  },

  async deleteUser(userId: number) {
    await api.delete(`/platform/admin/users/${userId}`);
  },

  async resetUserPassword(userId: number, newPassword: string) {
    const response = await api.post(`/platform/admin/users/${userId}/reset-password`, {
      new_password: newPassword
    });
    return response.data;
  },

  async toggleUserActive(userId: number) {
    const response = await api.put(`/platform/admin/users/${userId}/toggle-active`);
    return response.data;
  },

  // Admin - Apps
  async getApps(skip = 0, limit = 100) {
    const response = await api.get(`/platform/admin/apps?skip=${skip}&limit=${limit}`);
    return response.data;
  },

  async createApp(appData: any) {
    const response = await api.post('/platform/admin/apps', appData);
    return response.data;
  },

  async updateApp(appId: number, appData: any) {
    const response = await api.put(`/platform/admin/apps/${appId}`, appData);
    return response.data;
  },

  async deleteApp(appId: number) {
    await api.delete(`/platform/admin/apps/${appId}`);
  },

  async updateAppStatus(appId: number, status: string) {
    const response = await api.put(`/platform/admin/apps/${appId}/status`, null, {
      params: { new_status: status }
    });
    return response.data;
  },

  // Admin - Permissions
  async getUserPermissions(userId: number) {
    const response = await api.get(`/platform/admin/permissions/user/${userId}`);
    return response.data;
  },

  async getAppPermissions(appId: number) {
    const response = await api.get(`/platform/admin/permissions/app/${appId}`);
    return response.data;
  },

  async createPermission(permissionData: any) {
    const response = await api.post('/platform/admin/permissions', permissionData);
    return response.data;
  },

  async deletePermission(permissionId: number) {
    await api.delete(`/platform/admin/permissions/${permissionId}`);
  },

  // Admin - Deployment
  async uploadDockerImage(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/platform/admin/deploy/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async deployApp(appId: number, dockerImage: string, filePath?: string) {
    const response = await api.post(`/platform/admin/deploy/${appId}`, null, {
      params: { docker_image: dockerImage, file_path: filePath }
    });
    return response.data;
  },

  async getDeploymentStatus(deploymentId: number) {
    const response = await api.get(`/platform/admin/deploy/status/${deploymentId}`);
    return response.data;
  },

  async getDeploymentHistory(skip = 0, limit = 50, appId?: number) {
    const params: any = { skip, limit };
    if (appId) params.app_id = appId;
    const response = await api.get('/platform/admin/deploy/history', { params });
    return response.data;
  },

  async stopApp(appId: number) {
    const response = await api.post(`/platform/admin/deploy/stop/${appId}`);
    return response.data;
  },

  async startApp(appId: number) {
    const response = await api.post(`/platform/admin/deploy/start/${appId}`);
    return response.data;
  },

  // Feedback
  async getFeedback(appId?: number, status?: string, skip = 0, limit = 50) {
    const params: any = { skip, limit };
    if (appId) params.app_id = appId;
    if (status) params.status = status;
    const response = await api.get<Feedback[]>('/platform/feedback', { params });
    return response.data;
  },

  async createFeedback(feedbackData: any) {
    const response = await api.post<Feedback>('/platform/feedback', feedbackData);
    return response.data;
  },

  async getFeedbackDetails(feedbackId: number) {
    const response = await api.get<Feedback>(`/platform/feedback/${feedbackId}`);
    return response.data;
  },

  async updateFeedback(feedbackId: number, feedbackData: any) {
    const response = await api.put<Feedback>(`/platform/feedback/${feedbackId}`, feedbackData);
    return response.data;
  },

  async addFeedbackComment(feedbackId: number, comment: string) {
    const response = await api.post<FeedbackComment>(`/platform/feedback/${feedbackId}/comments`, {
      comment
    });
    return response.data;
  },

  async getFeedbackComments(feedbackId: number) {
    const response = await api.get<FeedbackComment[]>(`/platform/feedback/${feedbackId}/comments`);
    return response.data;
  },
};


