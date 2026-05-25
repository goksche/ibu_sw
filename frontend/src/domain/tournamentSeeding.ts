import type { Tournament } from '../types';

/** Normalisiert DB/API-Werte (Leerzeichen, Großschreibung). */
export function normalizedGroupDistribution(t: Tournament): string {
  return String(t.group_distribution ?? '')
    .trim()
    .toLowerCase();
}

export function effectiveGroupsCount(t: Tournament): number {
  const raw = t.groups_count as unknown;
  const n = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Checkboxen + Speichern: wie Backend – Gruppenphase, Auslosung „seeded", mindestens 2 Gruppen.
 */
export function isSeedingUiApplicable(t: Tournament): boolean {
  if (!t.has_group_phase) return false;
  if (normalizedGroupDistribution(t) !== 'seeded') return false;
  return effectiveGroupsCount(t) > 1;
}

export type SeedingVisibility =
  | { kind: 'full' }
  | { kind: 'blocked'; reason: 'need_two_groups'; groupsCount: number }
  | { kind: 'hidden'; reason: 'not_seeded_distribution'; distribution: string }
  | { kind: 'hidden'; reason: 'no_group_phase' };

export function getSeedingVisibility(t: Tournament): SeedingVisibility {
  if (!t.has_group_phase) {
    return { kind: 'hidden', reason: 'no_group_phase' };
  }
  const gd = normalizedGroupDistribution(t);
  if (gd !== 'seeded') {
    return { kind: 'hidden', reason: 'not_seeded_distribution', distribution: gd || '(leer)' };
  }
  const gc = effectiveGroupsCount(t);
  if (gc <= 1) {
    return { kind: 'blocked', reason: 'need_two_groups', groupsCount: gc };
  }
  return { kind: 'full' };
}
