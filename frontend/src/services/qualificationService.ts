// Qualification Service
import api from './api';
import { QualificationPlan, KOStartRound } from '../types';

export interface QualificationCandidate {
  participant_id: number;
  name: string;
  group_id?: number;
  group_name?: string;
  position: number;
  qualified: boolean;
  stats: {
    points?: number;
    diff: number;
    goals_for: number;
    goals_against: number;
  };
}

export interface GroupQualifiers {
  group_id: number;
  group_name: string;
  basis_qualifiers: QualificationCandidate[];
}

export interface FallbackCandidateRule {
  position: number;
  count: number;
  selection: string;
  candidates: QualificationCandidate[];
  cutoff_tie_group?: number[];
  /** Anzahl der noch manuell zu wählenden Plätze bei Grenz-Gleichstand (≤ count) */
  manual_selection_required?: number;
  manual_selected_ids?: number[];
}

export interface QualificationTable {
  tournament_id: number;
  qualification_plan: QualificationPlan;
  basis_per_group: number;
  qualified_count: number;
  group_qualifiers: GroupQualifiers[];
  fallback_candidates: FallbackCandidateRule[];
  all_qualified_participants: number[];
}

export const qualificationService = {
  // Calculate qualification plan
  async calculateQualificationPlan(
    groupsCount: number,
    koStartRound: KOStartRound
  ): Promise<QualificationPlan> {
    const response = await api.get<QualificationPlan>(
      '/tournaments/calculate-qualification-plan',
      {
        params: {
          groups_count: groupsCount,
          ko_start_round: koStartRound,
        },
      }
    );
    return response.data;
  },

  // Get qualification table
  async getQualificationTable(tournamentId: number): Promise<QualificationTable> {
    const response = await api.get<QualificationTable>(
      `/tournaments/${tournamentId}/qualification-table`
    );
    return response.data;
  },

  // Manually select fallback qualifiers for a tied position
  async setManualFallbackSelection(
    tournamentId: number,
    position: number,
    selectedIds: number[]
  ): Promise<any> {
    const response = await api.post(`/tournaments/${tournamentId}/qualification-table/manual`, {
      position,
      selected_ids: selectedIds
    });
    return response.data;
  },
};
