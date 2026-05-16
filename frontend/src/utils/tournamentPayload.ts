/**
 * Normalisiert Turnier-Schreib-Payloads vor POST/PUT (API-Contract v1.8.3).
 */

import type { Tournament } from '../types';

type WritePayload = Record<string, unknown>;

function stripUndefined<T extends WritePayload>(obj: T): T {
  const out = { ...obj };
  for (const key of Object.keys(out)) {
    if (out[key] === undefined) delete out[key];
  }
  return out;
}

/** UI „Siege“ als Wertung → API: points + tie_breaking_rules mit wins zuerst */
function normalizeLeagueScoring(payload: WritePayload): void {
  if (payload.league_scoring_system !== 'wins') return;
  payload.league_scoring_system = 'points';
  const rules = Array.isArray(payload.tie_breaking_rules)
    ? [...(payload.tie_breaking_rules as string[])]
    : [];
  if (!rules.includes('wins')) rules.unshift('wins');
  payload.tie_breaking_rules = rules;
}

/**
 * ko_draw_method ist führend; ko_distribution nur wenn Backend-Legacy es braucht.
 * (Server normalize_mode_payload setzt Spiegel bei Bedarf — doppelte Widersprüche vermeiden.)
 */
function normalizeKoLegacyMirror(payload: WritePayload): void {
  const method = payload.ko_draw_method as string | null | undefined;
  const distribution = payload.ko_distribution as string | null | undefined;
  if (!method) {
    return;
  }
  if (method === 'random_each_round') {
    payload.ko_distribution = 'random_each_round';
    return;
  }
  if (method === 'manual') {
    payload.ko_distribution = 'predefined_slots';
    return;
  }
  if (method === 'fixed_cross' || method === 'same_position_cross' || method === 'predefined_bracket') {
    if (distribution && distribution !== 'cross' && distribution !== 'predefined_slots') {
      delete payload.ko_distribution;
    }
    return;
  }
  if (distribution && distribution !== method) {
    delete payload.ko_distribution;
  }
}

export function sanitizeTournamentWritePayload(
  raw: Partial<Tournament> | WritePayload
): WritePayload {
  const payload: WritePayload = stripUndefined({ ...raw });

  if (!payload.has_ko_phase) {
    delete payload.ko_distribution;
    delete payload.ko_draw_method;
    delete payload.ko_pairing_mode;
    delete payload.ko_structure;
    delete payload.ko_participants;
    delete payload.ko_first_round_size;
  }

  if (!payload.has_group_phase) {
    payload.groups_count = 0;
    payload.group_distribution = 'random';
    delete payload.spielfeld_assignment_mode;
  }

  normalizeLeagueScoring(payload);
  normalizeKoLegacyMirror(payload);

  return payload;
}
