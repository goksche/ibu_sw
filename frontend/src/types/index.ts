// TypeScript Types
export interface User {
  id: number;
  username: string;
  email: string;
  role: 'power_admin' | 'admin' | 'user' | 'viewer';
  is_active: boolean;
  created_at: string;
}

export type KOStructure = 
  | 'single_elimination'
  | 'single_elimination_with_third'
  | 'consolation_bracket'
  | 'double_elimination'
  | 'triple_elimination'
  | 'aggregate_ko'
  | 'group_then_single_ko'
  | 'group_then_double_ko'
  | 'ko_with_group_winner_advantage'
  | 'page_playoff';

export type KODrawMethod =
  | 'fixed_cross'
  | 'same_position_cross'
  | 'overall_seeding'
  | 'pot_system'
  | 'full_random'
  | 'random_each_round'
  | 'bonus_draw_for_winners'
  | 'predefined_bracket'
  | 'manual';

export type KODrawMode =
  | 'random_first_round'
  | 'random_each_round'
  | 'predefined_slots'
  | 'cross'
  | 'draw';

export type KOStartRound = 
  | 'round_of_32'  // 32 Teilnehmer
  | 'round_of_16'  // 16 Teilnehmer
  | 'quarterfinal'  // 8 Teilnehmer
  | 'semifinal'  // 4 Teilnehmer
  | 'final';  // 2 Teilnehmer

export type LeagueVariant = 'classic' | 'double' | 'multiple';
export type TournamentModeVariant =
  | 'L1' | 'L2' | 'L3' | 'L4'
  | 'K1' | 'K2' | 'K3' | 'K4' | 'K5' | 'K6'
  | 'C1' | 'C2' | 'C3' | 'C4' | 'C5';
export type KOPairingVariant = 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6' | 'P7';

export interface QualificationPlan {
  required_participants: number;
  basis_per_group: number;
  remainder: number;
  fallback_rules: Array<{
    position: number;
    count: number;
    selection: 'best';
  }>;
}

export interface Tournament {
  id: number;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  mode: 'round_robin' | 'knockout' | 'combined';
  status: 'planned' | 'running' | 'completed';
  has_group_phase: boolean;
  has_ko_phase: boolean;
  groups_count: number;
  participants_per_group: number | null;
  group_distribution: string;
  ko_participants: number;  // Legacy
  ko_first_round_size: number | null;  // Legacy
  ko_start_round?: KOStartRound;
  ko_fallback_qualifiers?: Array<{
    position: number;
    count: number;
    selection: 'best';
  }>;
  ko_distribution: KODrawMode | null;  // Deprecated
  mode_variant?: TournamentModeVariant | null;
  ko_pairing_mode?: KOPairingVariant | null;
  ko_structure: KOStructure | null;
  ko_draw_method: KODrawMethod | null;
  ko_third_place_match: boolean;
  ko_group_winner_advantage: boolean;
  ko_block_same_group: boolean;
  ko_block_same_position: boolean;
  ko_random_seed: number | null;
  league_scoring_system: 'points' | 'difference' | 'wins' | null;
  league_points_win?: number;
  league_points_draw?: number;
  league_points_loss?: number;
  tie_breaking_rules: string[] | null;
  head_referee?: string | null;
  scorekeeper?: string | null;
  league_variant?: LeagueVariant;
  league_rounds_multiplier?: number;
  is_template: boolean;
  seeded_participant_ids: number[] | null;
  show_matches: boolean;
  show_tables: boolean;
  location_id: number | null;
  visibility?: 'public' | 'shared' | 'private';
  spielfeld_assignment_mode?: string;
  created_at: string;
  updated_at: string;
  creator_id: number | null;
  /** Echte Anzahl Turnierteilnehmer (API); Karten bevorzugen dies vor Planungsfeldern */
  participant_count?: number | null;
  /** Bei status completed: Sieger (Platz 1), falls auswertbar */
  winner_name?: string | null;
}

export interface Spielfeld {
  id: number;
  location_id: number;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Location {
  id: number;
  name: string;
  spielfelder: Spielfeld[];
  created_at: string;
  updated_at: string;
}

export interface LeagueParticipantSummary {
  id: number;
  first_name: string;
  last_name: string;
}

export interface LeagueTournamentSummary {
  id: number;
  name: string;
  start_date?: string;
  end_date?: string | null;
  status?: string | null;
}

export type LeagueMode = 'liga' | 'masters';
export type LeagueStatus = 'geplant' | 'laufend' | 'abgeschlossen';
export type TournamentModeForLeague = 'round_robin' | 'knockout' | 'combined';
export type SeasonType = 'year' | 'dates' | 'season';

export interface PlacementPointsTop {
  rank: number;
  points: number;
}

export interface PlacementPointsKORound {
  label: string;
  from_rank: number;
  to_rank: number;
  points: number;
}

export interface PlacementPointsSchema {
  top: PlacementPointsTop[];
  ko_rounds: PlacementPointsKORound[];
  participation_points: number;
}

export interface League {
  id: number;
  name: string;
  description: string | null;
  scoring_schema: Record<string, number> | null;
  mode_presets: Record<string, any> | null;
  status: LeagueStatus;
  league_mode: LeagueMode;
  tournament_mode: TournamentModeForLeague;
  placement_points: PlacementPointsSchema | Record<string, any> | null;
  masters_ko_count: number | null;
  auto_tournament_count: number | null;
  auto_tournament_mode: string | null;
  auto_tournament_settings: Record<string, any> | null;
  season_type: SeasonType;
  season_year: string | null;
  start_date: string | null;
  end_date: string | null;
  participant_ids: number[];
  tournament_ids: number[];
  participants: LeagueParticipantSummary[];
  tournaments: LeagueTournamentSummary[];
  created_at: string;
  updated_at: string;
}

export interface LeagueStandingEntry {
  rank: number;
  participant_id: number;
  first_name: string;
  last_name: string;
  tournaments_played: number;
  total_points: number;
  placements: Array<{
    tournament_id: number;
    tournament_name: string;
    placement: number | null;
    points: number;
  }>;
}

export interface LeagueStandingsResponse {
  league_id: number;
  league_name: string;
  entries: LeagueStandingEntry[];
}

export interface Participant {
  id: number;
  first_name: string;
  last_name: string;
  club: string | null;
  scolia_id: string | null;
  email: string | null;
  nickname: string | null;
  created_at: string;
  updated_at: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  role: 'power_admin' | 'admin' | 'user' | 'viewer';
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export interface UserWithPermissions extends User {
  app_permissions?: number[];
}

// Platform Types
export interface App {
  id: number;
  name: string;
  display_name: string;
  description: string | null;
  icon_url: string | null;
  route_path: string;
  container_name: string;
  docker_image: string;
  internal_port: number;
  status: 'active' | 'inactive' | 'deploying' | 'error';
  version: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface Feedback {
  id: number;
  app_id: number;
  user_id: number;
  feedback_type: 'bug' | 'feature_request' | 'improvement' | 'other';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  attachments: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface FeedbackComment {
  id: number;
  feedback_id: number;
  user_id: number;
  comment: string;
  created_at: string;
}

export interface Group {
  id: number;
  tournament_id: number;
  name: string;
  spielfeld_id?: number | null;
}

export interface GroupWithParticipants extends Group {
  participants: Array<{
    id: number;
    first_name: string;
    last_name: string;
  }>;
}

export type LiveTickerSlideType = 'groups' | 'qualification' | 'ko';

export interface LiveTickerSlidesEnabled {
  groups: boolean;
  qualification: boolean;
  ko: boolean;
}

export interface LiveTickerSettings {
  slide_duration_sec: number;
  refresh_interval_sec: number;
  slide_order: LiveTickerSlideType[];
  slides_enabled: LiveTickerSlidesEnabled;
  only_running_group_matches: boolean;
  show_spielfeld: boolean;
  show_results: boolean;
  mark_decision_matches: boolean;
  max_groups_per_slide: 1 | 2;
}

export interface DashboardSettings {
  default_sort: 'date' | 'name' | 'status';
}

export interface PlaceholderSettings {
  language: string;
  timezone: string;
  layout: 'standard' | 'neon' | 'neon_yellow' | 'neon_cyan' | 'neon_blue' | 'arena' | 'gsmartsol';
  font_family:
    | 'Protest Guerilla'
    | 'Source Sans 3'
    | 'Helvetica'
    | 'Baskerville'
    | 'Times'
    | 'Gotham'
    | 'Bodoni'
    | 'Didot'
    | 'Rockwell'
    | 'Franklin'
    | 'Sabon'
    | 'News Gothic'
    | 'Elliot Six'
    | 'Angelina'
    | 'Mushroom 6'
    | 'Rocksmith'
    | 'The Doorman'
    | 'Rampstar';
}

export interface AppSettings {
  live_ticker: LiveTickerSettings;
  dashboard: DashboardSettings;
  placeholders: PlaceholderSettings;
}

export interface PageViewLog {
  id: number;
  user_id: number | null;
  path: string;
  query: string | null;
  referrer: string | null;
  title: string | null;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface LoginEventLog {
  id: number;
  user_id: number | null;
  username: string | null;
  email: string | null;
  event_type: string;
  success: boolean;
  reason: string | null;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface ApiRequestLog {
  id: number;
  user_id: number | null;
  method: string;
  path: string;
  status_code: number;
  duration_ms: number;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface AdminActionLog {
  id: number;
  user_id: number | null;
  method: string;
  path: string;
  status_code: number;
  action: string;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface NginxLogResponse {
  lines: string[];
  tail: number;
}