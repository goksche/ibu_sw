import api from './api';

export interface Share {
  id: number;
  tournament_id?: number;
  league_id?: number;
  shared_with_user_id: number | null;
  shared_with_email: string | null;
  permission: 'view' | 'edit';
  created_at: string;
}

export type Visibility = 'public' | 'shared' | 'private';

export const sharingService = {
  // Tournament
  async setTournamentVisibility(tournamentId: number, visibility: Visibility) {
    const r = await api.put(`/tournaments/${tournamentId}/visibility`, { visibility });
    return r.data;
  },
  async getTournamentShares(tournamentId: number): Promise<Share[]> {
    const r = await api.get<Share[]>(`/tournaments/${tournamentId}/shares`);
    return r.data;
  },
  async shareTournament(tournamentId: number, email: string, permission: 'view' | 'edit' = 'view'): Promise<Share> {
    const r = await api.post<Share>(`/tournaments/${tournamentId}/share`, { email, permission });
    return r.data;
  },
  async removeTournamentShare(tournamentId: number, shareId: number) {
    await api.delete(`/tournaments/${tournamentId}/share/${shareId}`);
  },

  // League
  async setLeagueVisibility(leagueId: number, visibility: Visibility) {
    const r = await api.put(`/leagues/${leagueId}/visibility`, { visibility });
    return r.data;
  },
  async getLeagueShares(leagueId: number): Promise<Share[]> {
    const r = await api.get<Share[]>(`/leagues/${leagueId}/shares`);
    return r.data;
  },
  async shareLeague(leagueId: number, email: string, permission: 'view' | 'edit' = 'view'): Promise<Share> {
    const r = await api.post<Share>(`/leagues/${leagueId}/share`, { email, permission });
    return r.data;
  },
  async removeLeagueShare(leagueId: number, shareId: number) {
    await api.delete(`/leagues/${leagueId}/share/${shareId}`);
  },
};
