import api from './api';

export interface DateRangeParams {
  start_date?: string;
  end_date?: string;
  preset?: '12m' | '6m' | '3m' | '1m';
}

export interface ModeCount {
  mode: string;
  count: number;
}

export interface MonthCount {
  month: string;
  count: number;
}

export interface OverviewStats {
  tournaments_count: number;
  matches_count: number;
  participants_count: number;
  locations_count: number;
  completed_tournaments: number;
  running_tournaments: number;
  planned_tournaments: number;
  tournaments_by_mode: ModeCount[];
  tournaments_by_month: MonthCount[];
  matches_by_month: MonthCount[];
}

export interface ParticipantStats {
  id: number;
  first_name: string;
  last_name: string;
  club: string | null;
  tournaments_count: number;
  matches_played: number;
  wins: number;
  losses: number;
  draws: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  win_rate: number;
}

export interface ParticipantsRankingResponse {
  participants: ParticipantStats[];
  total: number;
}

export interface TournamentHistoryEntry {
  tournament_id: number;
  tournament_name: string;
  start_date: string;
  matches_played: number;
  wins: number;
  losses: number;
  draws: number;
  goals_for: number;
  goals_against: number;
}

export interface ParticipantDetailStats extends ParticipantStats {
  tournament_history: TournamentHistoryEntry[];
}

export interface TournamentStatsEntry {
  id: number;
  name: string;
  start_date: string;
  end_date: string | null;
  mode: string;
  status: string;
  participants_count: number;
  group_matches_count: number;
  ko_matches_count: number;
  total_matches: number;
  completed_matches: number;
  location_name: string | null;
}

export interface TournamentStatsResponse {
  tournaments: TournamentStatsEntry[];
  total: number;
}

function buildParams(range: DateRangeParams, extra?: Record<string, string | number>) {
  const params: Record<string, string | number> = {};
  if (range.start_date) params.start_date = range.start_date;
  if (range.end_date) params.end_date = range.end_date;
  if (range.preset) params.preset = range.preset;
  if (extra) Object.assign(params, extra);
  return params;
}

export const statisticsService = {
  async getOverview(range: DateRangeParams = {}): Promise<OverviewStats> {
    const { data } = await api.get('/statistics/overview', { params: buildParams(range) });
    return data;
  },

  async getParticipantsRanking(
    range: DateRangeParams = {},
    sortBy = 'wins',
    limit = 50,
  ): Promise<ParticipantsRankingResponse> {
    const { data } = await api.get('/statistics/participants', {
      params: buildParams(range, { sort_by: sortBy, limit }),
    });
    return data;
  },

  async getParticipantDetail(
    participantId: number,
    range: DateRangeParams = {},
  ): Promise<ParticipantDetailStats> {
    const { data } = await api.get(`/statistics/participants/${participantId}`, {
      params: buildParams(range),
    });
    return data;
  },

  async getTournamentStats(range: DateRangeParams = {}): Promise<TournamentStatsResponse> {
    const { data } = await api.get('/statistics/tournaments', { params: buildParams(range) });
    return data;
  },
};
