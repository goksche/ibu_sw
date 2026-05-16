/**
 * API-Contract v1.8.3 — Frontend-Spiegel der Backend-Enums/Patterns (backend/app/models, schemas/tournament.py).
 * Bei Abweichungen zuerst hier und in scripts/verify_api_contract.py anpassen.
 */

import type {
  GroupDistribution,
  KODrawMethod,
  KOStructure,
  KODrawMode,
  LeagueVariant,
  SpielfeldAssignmentMode,
  TournamentModeVariant,
  KOPairingVariant,
} from '../types';

export type TournamentMode = 'round_robin' | 'knockout' | 'combined';
export type LeagueScoringSystemApi = 'points' | 'difference';

/** Werte wie backend.app.models.tournament.KOStructure */
export const KO_STRUCTURES = [
  'single_elimination',
  'single_elimination_with_third',
  'single_elimination_with_ranking',
  'consolation_bracket',
  'double_elimination',
  'triple_elimination',
  'aggregate_ko',
  'group_then_single_ko',
  'group_then_double_ko',
  'ko_with_group_winner_advantage',
  'page_playoff',
] as const satisfies readonly KOStructure[];

/** Werte wie backend.app.models.tournament.KODrawMethod (+ Migration random_each_round) */
export const KO_DRAW_METHODS = [
  'fixed_cross',
  'same_position_cross',
  'overall_seeding',
  'pot_system',
  'full_random',
  'random_each_round',
  'bonus_draw_for_winners',
  'predefined_bracket',
  'manual',
] as const satisfies readonly KODrawMethod[];

export const GROUP_DISTRIBUTIONS = ['random', 'seeded', 'manual'] as const satisfies readonly GroupDistribution[];

export const SPIELFELD_ASSIGNMENT_MODES = [
  'random',
  'group_fixed',
  'group_random',
] as const satisfies readonly SpielfeldAssignmentMode[];

export const KO_DRAW_MODES_LEGACY = [
  'cross',
  'draw',
  'random_first_round',
  'random_each_round',
  'predefined_slots',
] as const satisfies readonly KODrawMode[];

export const MODE_VARIANTS_API = [
  'L1', 'L2', 'L3', 'L4',
  'K1', 'K2', 'K3', 'K4', 'K5', 'K6',
  'C1', 'C2', 'C3', 'C4', 'C5',
] as const satisfies readonly TournamentModeVariant[];

export const KO_PAIRING_MODES_API = [
  'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7',
] as const satisfies readonly KOPairingVariant[];

export const LEAGUE_VARIANTS_API = ['classic', 'double', 'multiple'] as const satisfies readonly LeagueVariant[];

/**
 * Legacy-Felder — Backend spiegelt ggf. in normalize_mode_payload; neue Saves sollten
 * `ko_draw_method` führend lassen und `ko_distribution` nur bei random_each_round / Alt-Clients.
 */
export const LEGACY_TOURNAMENT_FIELDS = {
  ko_distribution: 'Deprecated — Backend setzt Spiegel aus ko_draw_method/ko_pairing_mode.',
  ko_participants: 'Legacy — Qualifikation aus Gruppen; bei combined weiter unterstützt.',
  ko_first_round_size: 'Legacy — bevorzugt ko_start_round.',
} as const;

export function isKOStructure(value: unknown): value is KOStructure {
  return typeof value === 'string' && (KO_STRUCTURES as readonly string[]).includes(value);
}

export function isKODrawMethod(value: unknown): value is KODrawMethod {
  return typeof value === 'string' && (KO_DRAW_METHODS as readonly string[]).includes(value);
}

export function isGroupDistribution(value: unknown): value is GroupDistribution {
  return typeof value === 'string' && (GROUP_DISTRIBUTIONS as readonly string[]).includes(value);
}

export function isSpielfeldAssignmentMode(value: unknown): value is SpielfeldAssignmentMode {
  return typeof value === 'string' && (SPIELFELD_ASSIGNMENT_MODES as readonly string[]).includes(value);
}
