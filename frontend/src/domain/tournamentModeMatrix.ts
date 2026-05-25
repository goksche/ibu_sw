export type TournamentModeVariant =
  | 'L1'
  | 'L2'
  | 'L3'
  | 'L4'
  | 'K1'
  | 'K2'
  | 'K3'
  | 'K4'
  | 'K5'
  | 'K6'
  | 'C1'
  | 'C2'
  | 'C3'
  | 'C4'
  | 'C5';

export type KOPairingVariant = 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6' | 'P7';

export interface ModeVariantSpec {
  id: TournamentModeVariant;
  family: 'Liga' | 'KO' | 'Kombi';
  title: string;
  description: string;
  baseMode: 'round_robin' | 'knockout' | 'combined';
}

export const MODE_VARIANTS: ModeVariantSpec[] = [
  { id: 'L1', family: 'Liga', title: 'L1 Round Robin', description: 'Round Robin mit konfigurierbaren Gruppen und Durchgängen.', baseMode: 'round_robin' },
  { id: 'L4', family: 'Liga', title: 'L4 Swiss System', description: 'Paarungen nach aktueller Punktnahe.', baseMode: 'round_robin' },
  { id: 'K1', family: 'KO', title: 'K1 Single Elimination', description: 'Eine Niederlage = ausgeschieden.', baseMode: 'knockout' },
  { id: 'K2', family: 'KO', title: 'K2 Double Elimination', description: 'Zwei Niederlagen = ausgeschieden.', baseMode: 'knockout' },
  { id: 'K3', family: 'KO', title: 'K3 Triple Elimination', description: 'Drei Niederlagen = ausgeschieden.', baseMode: 'knockout' },
  { id: 'K4', family: 'KO', title: 'K4 Page Playoff', description: 'Top-4 Finalsystem mit Vorteilslogik.', baseMode: 'knockout' },
  { id: 'K5', family: 'KO', title: 'K5 KO mit Platzierungsspiel', description: 'Zusatzspiel(e) fuer Platzierungen.', baseMode: 'knockout' },
  { id: 'K6', family: 'KO', title: 'K6 Consolation', description: 'Trostrunde fuer Ausgeschiedene.', baseMode: 'knockout' },
  { id: 'C1', family: 'Kombi', title: 'C1 Gruppen -> KO', description: 'Gruppenphase gefolgt von KO.', baseMode: 'combined' },
  { id: 'C2', family: 'Kombi', title: 'C2 Swiss -> KO', description: 'Swiss-Vorphase gefolgt von KO.', baseMode: 'combined' },
  { id: 'C3', family: 'Kombi', title: 'C3 Liga -> Page', description: 'Ligaphase und Page-Playoff.', baseMode: 'combined' },
  { id: 'C4', family: 'Kombi', title: 'C4 Gruppen -> Double Elim', description: 'Gruppenphase und Double-KO.', baseMode: 'combined' },
  { id: 'C5', family: 'Kombi', title: 'C5 Mehrstufig', description: 'Mehrere Gruppenstufen vor KO.', baseMode: 'combined' },
];

export const PAIRING_VARIANTS: Array<{ id: KOPairingVariant; label: string; description: string }> = [
  { id: 'P1', label: 'P1 Zufaellig', description: 'Zufaellige Auslosung der Paarungen.' },
  { id: 'P2', label: 'P2 Seeding', description: 'Beste gegen schlechteste gemaess Ranking.' },
  { id: 'P3', label: 'P3 Kreuzpaarung', description: 'z.B. A1 vs B2 und B1 vs A2.' },
  { id: 'P4', label: 'P4 Gruppen vermeiden', description: 'Sperrt direkte Wiederbegegnungen aus Gruppen.' },
  { id: 'P5', label: 'P5 Snake Seeding', description: 'Schlangenfoermige Seed-Verteilung.' },
  { id: 'P6', label: 'P6 Manuell', description: 'Paarungen werden manuell gesetzt.' },
  { id: 'P7', label: 'P7 Jede Runde neu', description: 'Nach jeder KO-Runde neu auslosen (random_each_round).' },
];

/** Spiegel backend/app/core/mode_matrix.py DRAW_METHOD_TO_PAIRING */
export const DRAW_METHOD_TO_PAIRING: Record<string, KOPairingVariant> = {
  full_random: 'P1',
  overall_seeding: 'P2',
  fixed_cross: 'P3',
  same_position_cross: 'P3',
  pot_system: 'P5',
  manual: 'P6',
  predefined_bracket: 'P2',
  bonus_draw_for_winners: 'P2',
  random_each_round: 'P7',
};

export type KoDrawMethodValue =
  | 'fixed_cross'
  | 'same_position_cross'
  | 'overall_seeding'
  | 'pot_system'
  | 'full_random'
  | 'random_each_round'
  | 'bonus_draw_for_winners'
  | 'predefined_bracket'
  | 'manual';

const COMBINED_ONLY_METHODS = new Set<KoDrawMethodValue>([
  'fixed_cross',
  'same_position_cross',
  'bonus_draw_for_winners',
]);

const K_AND_C_METHODS: KoDrawMethodValue[] = [
  'overall_seeding',
  'pot_system',
  'full_random',
  'random_each_round',
  'predefined_bracket',
  'manual',
];

const COMBINED_METHODS: KoDrawMethodValue[] = [
  ...COMBINED_ONLY_METHODS,
  ...K_AND_C_METHODS,
];

/** Erlaubte ko_draw_method-Werte je Modus (Matrix v1.8.4). */
export function getAllowedKoDrawMethodValues(
  mode: 'round_robin' | 'knockout' | 'combined',
  hasGroupPhase: boolean
): KoDrawMethodValue[] {
  if (mode === 'knockout' && !hasGroupPhase) {
    return [...K_AND_C_METHODS];
  }
  if (mode === 'combined' || (mode === 'knockout' && hasGroupPhase)) {
    return [...COMBINED_METHODS];
  }
  return [];
}

export function pairingVariantsForMode(
  mode: 'round_robin' | 'knockout' | 'combined',
  hasGroupPhase: boolean
): typeof PAIRING_VARIANTS {
  if (mode === 'knockout' && !hasGroupPhase) {
    return PAIRING_VARIANTS.filter((p) => p.id !== 'P3' && p.id !== 'P4');
  }
  return PAIRING_VARIANTS;
}
