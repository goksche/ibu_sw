// Group Service - API calls for Groups
import api from './api';

export interface Group {
  id: number;
  tournament_id: number;
  name: string;
}

export interface GroupWithParticipants extends Group {
  participants: Array<{
    id: number;
    first_name: string;
    last_name: string;
  }>;
}

export interface GroupCreate {
  tournament_id: number;
  name: string;
}

export interface GroupUpdate {
  name?: string;
}

export interface GroupParticipantAdd {
  participant_id: number;
}

// API Calls
export const groupService = {
  // Get all groups for a tournament
  getGroups: async (tournamentId: number): Promise<Group[]> => {
    const response = await api.get(`/groups/`, {
      params: { tournament_id: tournamentId }
    });
    return response.data;
  },

  // Get a specific group with participants
  getGroup: async (groupId: number): Promise<GroupWithParticipants> => {
    const response = await api.get(`/groups/${groupId}`);
    return response.data;
  },

  // Create a new group
  createGroup: async (group: GroupCreate): Promise<Group> => {
    const response = await api.post('/groups/', group);
    return response.data;
  },

  // Update a group
  updateGroup: async (groupId: number, group: GroupUpdate): Promise<Group> => {
    const response = await api.put(`/groups/${groupId}`, group);
    return response.data;
  },

  // Delete a group
  deleteGroup: async (groupId: number): Promise<void> => {
    await api.delete(`/groups/${groupId}`);
  },

  // Add participant to group
  addParticipant: async (groupId: number, participant: GroupParticipantAdd): Promise<GroupWithParticipants> => {
    const response = await api.post(`/groups/${groupId}/participants`, participant);
    return response.data;
  },

  // Remove participant from group
  removeParticipant: async (groupId: number, participantId: number): Promise<void> => {
    await api.delete(`/groups/${groupId}/participants/${participantId}`);
  }
};

