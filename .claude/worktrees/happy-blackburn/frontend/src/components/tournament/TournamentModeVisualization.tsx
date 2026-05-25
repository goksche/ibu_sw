import { cn } from '@/lib/utils';

interface TournamentModeVisualizationProps {
  mode: 'round_robin' | 'knockout' | 'combined';
  hasGroupPhase?: boolean;
  hasKoPhase?: boolean;
  groupsCount?: number;
  participantsPerGroup?: number | null;
  groupDistribution?: string | null;
  koStartRound?: string | null;
  koStructure?: string | null;
  koDrawMethod?: string | null;
}

const koStartRoundLabels: Record<string, string> = {
  round_of_32: 'Runde der 32',
  round_of_16: 'Runde der 16',
  quarterfinal: 'Viertelfinale',
  semifinal: 'Halbfinale',
  final: 'Finale'
};

const koStructureLabels: Record<string, string> = {
  single_elimination: 'Einfach-KO',
  single_elimination_with_third: 'Einfach-KO mit Platz 3',
  consolation_bracket: 'Trostturnier',
  double_elimination: 'Doppel-KO',
  triple_elimination: 'Triple-KO',
  aggregate_ko: 'Hin- und Rückspiel',
  group_then_single_ko: 'Gruppenphase + Einfach-KO',
  group_then_double_ko: 'Gruppenphase + Doppel-KO',
  ko_with_group_winner_advantage: 'KO mit Vorteil für Gruppensieger',
  page_playoff: 'Page-Playoff-System'
};

const koDrawMethodLabels: Record<string, string> = {
  fixed_cross: 'Feste Kreuzpaarung',
  same_position_cross: 'Platzgleiches Kreuzen',
  overall_seeding: 'Gesamt-Seeding',
  pot_system: 'Topf-System',
  full_random: 'Vollzufällige Auslosung',
  bonus_draw_for_winners: 'Bonus-Auslosung für Gruppensieger',
  predefined_bracket: 'Vorgegebener Turnierbaum',
  manual: 'Manuell'
};

const groupDistributionLabels: Record<string, string> = {
  random: 'Zufällig',
  seeded: 'Gesetzt'
};

export default function TournamentModeVisualization({
  mode,
  hasGroupPhase,
  hasKoPhase,
  groupsCount,
  participantsPerGroup,
  groupDistribution,
  koStartRound,
  koStructure,
  koDrawMethod
}: TournamentModeVisualizationProps) {
  const showGroupPhase = hasGroupPhase ?? mode !== 'knockout';
  const showKoPhase = hasKoPhase ?? mode !== 'round_robin';

  const groupDetails: string[] = [];
  if (groupsCount && groupsCount > 0) {
    groupDetails.push(`Gruppen: ${groupsCount}`);
  }
  if (participantsPerGroup) {
    groupDetails.push(`Teilnehmer pro Gruppe: ${participantsPerGroup}`);
  }
  if (groupDistribution) {
    const label = groupDistributionLabels[groupDistribution] || groupDistribution;
    groupDetails.push(`Verteilung: ${label}`);
  }

  const koDetails: string[] = [];
  if (koStartRound) {
    const label = koStartRoundLabels[koStartRound] || koStartRound;
    koDetails.push(`Start: ${label}`);
  }
  if (koStructure) {
    const label = koStructureLabels[koStructure] || koStructure;
    koDetails.push(`Struktur: ${label}`);
  }
  if (koDrawMethod) {
    const label = koDrawMethodLabels[koDrawMethod] || koDrawMethod;
    koDetails.push(`Auslosung: ${label}`);
  }

  return (
    <div className={cn('rounded-lg border border-border p-4')}>
      <div className="font-bold mb-3 text-foreground">
        Modus-Visualisierung
      </div>
      <div className="flex items-stretch gap-3 flex-wrap">
        {showGroupPhase && (
          <div className="flex-1 min-w-[220px] rounded-lg border border-border p-3 bg-muted">
            <div className="font-bold mb-2 text-foreground">
              Gruppenphase
            </div>
            {groupDetails.length > 0 ? (
              <ul className="m-0 pl-5 text-muted-foreground list-disc">
                {groupDetails.map((detail) => (
                  <li key={detail} className="mb-1">{detail}</li>
                ))}
              </ul>
            ) : (
              <div className="text-muted-foreground">Keine Details gesetzt.</div>
            )}
          </div>
        )}
        {showGroupPhase && showKoPhase && (
          <div className="self-center text-muted-foreground font-bold">-&gt;</div>
        )}
        {showKoPhase && (
          <div className="flex-1 min-w-[220px] rounded-lg border border-border p-3 bg-muted">
            <div className="font-bold mb-2 text-foreground">
              KO-Phase
            </div>
            {koDetails.length > 0 ? (
              <ul className="m-0 pl-5 text-muted-foreground list-disc">
                {koDetails.map((detail) => (
                  <li key={detail} className="mb-1">{detail}</li>
                ))}
              </ul>
            ) : (
              <div className="text-muted-foreground">Keine Details gesetzt.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
