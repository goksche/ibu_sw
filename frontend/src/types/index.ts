// TypeScript Types
export interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'user' | 'viewer';
  is_active: boolean;
  created_at: string;
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
  ko_participants: number;
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
  license_number: string | null;
  email: string | null;
  phone: string | null;
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

