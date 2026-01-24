// TypeScript Types
export interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'user' | 'viewer';
  is_active: boolean;
  created_at: string;
}

export type KOStructure = 
  | 'single_elimination'
  | 'single_elimination_with_third'
  | 'double_elimination'
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
  | 'bonus_draw_for_winners'
  | 'predefined_bracket'
  | 'manual';

export type KOStartRound = 
  | 'round_of_32'  // 32 Teilnehmer
  | 'round_of_16'  // 16 Teilnehmer
  | 'quarterfinal'  // 8 Teilnehmer
  | 'semifinal'  // 4 Teilnehmer
  | 'final';  // 2 Teilnehmer

export type LeagueVariant = 'classic' | 'double' | 'multiple';

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
  ko_distribution: string | null;  // Deprecated
  ko_structure: KOStructure | null;
  ko_draw_method: KODrawMethod | null;
  ko_third_place_match: boolean;
  ko_group_winner_advantage: boolean;
  ko_block_same_group: boolean;
  ko_block_same_position: boolean;
  ko_random_seed: number | null;
  league_scoring_system: 'points' | 'difference' | null;
  tie_breaking_rules: string[] | null;
  league_variant?: LeagueVariant;
  league_rounds_multiplier?: number;
  is_template: boolean;
  seeded_participant_ids: number[] | null;
  show_matches: boolean;
  show_tables: boolean;
  created_at: string;
  updated_at: string;
  creator_id: number | null;
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
  role: 'admin' | 'user' | 'viewer';
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
}

export interface GroupWithParticipants extends Group {
  participants: Array<{
    id: number;
    first_name: string;
    last_name: string;
  }>;
}

