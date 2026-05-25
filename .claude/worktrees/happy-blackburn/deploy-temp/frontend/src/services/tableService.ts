// Table Service - API calls for Tables
import api from './api';

export interface GroupTableEntry {
  rank: number;
  participant_id: number;
  name: string;
  games: number;
  wins: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  diff: number;
  won_decision_match?: boolean;  // Flag indicating if participant won a decision match
}

export interface GroupTable {
  group_id: number;
  group_name: string;
  table: GroupTableEntry[];
}

export interface TournamentStanding {
  rank: number;
  participant_id: number;
  name: string;
}

export interface TournamentStandings {
  tournament_id: number;
  standings: TournamentStanding[];
  status?: string;
}

export const tableService = {
  // Get group table
  async getGroupTable(groupId: number): Promise<GroupTable> {
    const response = await api.get<GroupTable>(`/tables/group/${groupId}`);
    return response.data;
  },

  // Get tournament standings
  async getTournamentStandings(tournamentId: number): Promise<TournamentStandings> {
    const response = await api.get<TournamentStandings>(`/tables/tournament/${tournamentId}`);
    return response.data;
  },
};

