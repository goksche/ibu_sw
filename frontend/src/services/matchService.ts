// Match Service - API calls for Matches
import api from './api';

export interface MatchBase {
  round: number;
  match_no: number;
}

export interface GroupMatch extends MatchBase {
  id: number;
  tournament_id: number;
  group_id: number;
  player1_id: number | null;
  player2_id: number | null;
  score1: number | null;
  score2: number | null;
  is_decision_match: boolean;
}

export interface KnockoutMatch extends MatchBase {
  id: number;
  tournament_id: number;
  player1_id: number | null;
  player2_id: number | null;
  score1: number | null;
  score2: number | null;
}

export interface GroupMatchCreate {
  tournament_id: number;
  group_id: number;
  round: number;
  match_no: number;
  player1_id?: number;
  player2_id?: number;
}

export interface GroupMatchUpdate {
  player1_id?: number;
  player2_id?: number;
  score1?: number;
  score2?: number;
}

export interface KnockoutMatchCreate {
  tournament_id: number;
  round: number;
  match_no: number;
  player1_id?: number;
  player2_id?: number;
}

export interface KnockoutMatchUpdate {
  player1_id?: number;
  player2_id?: number;
  score1?: number;
  score2?: number;
}

// API Calls
export const matchService = {
  // Group Matches
  getGroupMatches: async (tournamentId: number, groupId?: number): Promise<GroupMatch[]> => {
    const response = await api.get('/matches/groups', {
      params: { tournament_id: tournamentId, group_id: groupId }
    });
    return response.data;
  },

  getGroupMatch: async (matchId: number): Promise<GroupMatch> => {
    const response = await api.get(`/matches/groups/${matchId}`);
    return response.data;
  },

  createGroupMatch: async (match: GroupMatchCreate): Promise<GroupMatch> => {
    const response = await api.post('/matches/groups', match);
    return response.data;
  },

  updateGroupMatch: async (matchId: number, match: GroupMatchUpdate): Promise<GroupMatch> => {
    const response = await api.put(`/matches/groups/${matchId}`, match);
    return response.data;
  },

  deleteGroupMatch: async (matchId: number): Promise<void> => {
    await api.delete(`/matches/groups/${matchId}`);
  },

  // Knockout Matches
  getKnockoutMatches: async (tournamentId: number): Promise<KnockoutMatch[]> => {
    const response = await api.get('/matches/knockout', {
      params: { tournament_id: tournamentId }
    });
    return response.data;
  },

  getKnockoutMatch: async (matchId: number): Promise<KnockoutMatch> => {
    const response = await api.get(`/matches/knockout/${matchId}`);
    return response.data;
  },

  createKnockoutMatch: async (match: KnockoutMatchCreate): Promise<KnockoutMatch> => {
    const response = await api.post('/matches/knockout', match);
    return response.data;
  },

  updateKnockoutMatch: async (matchId: number, match: KnockoutMatchUpdate): Promise<KnockoutMatch> => {
    const response = await api.put(`/matches/knockout/${matchId}`, match);
    return response.data;
  },

  deleteKnockoutMatch: async (matchId: number): Promise<void> => {
    await api.delete(`/matches/knockout/${matchId}`);
  }
};

