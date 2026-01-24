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
  points?: number;  // Only if points system is used
  won_decision_match?: boolean;  // Flag indicating if participant won a decision match
  is_in_tie_group?: boolean;  // True if participant is in a tie group with >2 participants
  tie_group_size?: number;  // Size of tie group if applicable
}

export interface MiniTableEntry {
  participant_id: number;
  name: string;
  games: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  diff: number;
  points?: number;  // Only if points system is used
}

export interface TieBreakMiniTable {
  scoring_value: number;  // Points or diff value that caused the tie
  participant_ids: number[];  // IDs of participants in this tie group
  mini_table: MiniTableEntry[];  // Mini table with only direct encounters
  is_completely_tied?: boolean;  // True if all participants have identical stats in mini table
}

export interface GroupTable {
  group_id: number;
  group_name: string;
  scoring_system?: 'points' | 'difference';
  table: GroupTableEntry[];
  tie_break_mini_tables?: TieBreakMiniTable[];  // Mini tables for tie groups with >2 participants
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

  // Generate playoff matches for tied participants
  async generateTieBreakPlayoff(groupId: number, participantIds: number[]): Promise<any> {
    const response = await api.post(`/tables/group/${groupId}/tie-break/playoff`, participantIds);
    return response.data;
  },

  // Resolve tie break randomly
  async resolveTieBreakRandom(groupId: number, participantIds: number[]): Promise<any> {
    const response = await api.post(`/tables/group/${groupId}/tie-break/random`, participantIds);
    return response.data;
  },

  // Resolve tie break manually
  async resolveTieBreakManual(groupId: number, participantIds: number[], winnerId: number): Promise<any> {
    const response = await api.post(`/tables/group/${groupId}/tie-break/manual`, {
      participant_ids: participantIds,
      winner_id: winnerId
    });
    return response.data;
  },
};

