import { cn } from '@/lib/utils';

interface TournamentModeVisualizationProps {
  mode: 'round_robin' | 'knockout' | 'combined';
  modeVariant?: string | null;
  hasGroupPhase?: boolean;
  hasKoPhase?: boolean;
  groupsCount?: number;
  participantsPerGroup?: number | null;
  groupDistribution?: string | null;
  koStartRound?: string | null;
  koStructure?: string | null;
  koDrawMethod?: string | null;
  koPairingMode?: string | null;
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
  seeded: 'Gesetzt',
  manual: 'Manuell'
};

export default function TournamentModeVisualization({
  mode,
  modeVariant,
  hasGroupPhase,
  hasKoPhase,
  groupsCount,
  participantsPerGroup,
  groupDistribution,
  koStartRound,
  koStructure,
  koDrawMethod,
  koPairingMode
}: TournamentModeVisualizationProps) {
  const showGroupPhase = hasGroupPhase ?? mode !== 'knockout';
  const showKoPhase = hasKoPhase ?? mode !== 'round_robin';
  const groupMeta = [
    groupsCount && groupsCount > 0 ? `Gruppen ${groupsCount}` : null,
    participantsPerGroup ? `${participantsPerGroup} pro Gruppe` : null,
    groupDistribution ? groupDistributionLabels[groupDistribution] || groupDistribution : null,
  ].filter(Boolean) as string[];
  const koMeta = [
    koStartRound ? koStartRoundLabels[koStartRound] || koStartRound : null,
    koStructure ? koStructureLabels[koStructure] || koStructure : null,
    koDrawMethod ? koDrawMethodLabels[koDrawMethod] || koDrawMethod : null,
    koPairingMode ? `Pairing ${koPairingMode}` : null,
  ].filter(Boolean) as string[];
  const invalidPureKoPairing =
    mode === 'knockout' &&
    !showGroupPhase &&
    (koPairingMode === 'P3' || koPairingMode === 'P4');

  return (
    <div className={cn('rounded-lg border border-border p-4')}>
      <div className="font-bold mb-3 text-foreground">
        Modus-Visualisierung
      </div>
      {modeVariant && (
        <div className="mb-3 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-foreground">
          Aktive Variante: <span className="font-semibold">{modeVariant}</span>
        </div>
      )}
      <div className="rounded-lg border border-border bg-muted/60 p-3">
        {mode === 'round_robin' && (
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Liga-Schema</div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="rounded border border-border bg-background p-2 text-center">Runde 1</div>
              <div className="rounded border border-border bg-background p-2 text-center">Runde 2</div>
              <div className="rounded border border-border bg-background p-2 text-center">Runde n</div>
            </div>
          </div>
        )}
        {mode === 'knockout' && (
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">KO-Pfad</div>
            <div className="grid grid-cols-4 gap-2 text-xs">
              <div className="rounded border border-border bg-background p-2 text-center">1/8</div>
              <div className="rounded border border-border bg-background p-2 text-center">1/4</div>
              <div className="rounded border border-border bg-background p-2 text-center">1/2</div>
              <div className="rounded border border-primary/50 bg-primary/10 p-2 text-center">Finale</div>
            </div>
          </div>
        )}
        {mode === 'combined' && (
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Kombi-Pfad</div>
            <div className="flex items-center gap-2 text-xs">
              <div className="rounded border border-border bg-background p-2 text-center flex-1">Vorphase</div>
              <div className="text-muted-foreground">-&gt;</div>
              <div className="rounded border border-border bg-background p-2 text-center flex-1">Qualifikation</div>
              <div className="text-muted-foreground">-&gt;</div>
              <div className="rounded border border-primary/50 bg-primary/10 p-2 text-center flex-1">KO-Finale</div>
            </div>
          </div>
        )}
      </div>
      <div className="mt-3 grid gap-2 text-xs text-muted-foreground">
        {showGroupPhase && (
          <div className="rounded border border-border bg-background px-3 py-2">
            Gruppenphase: {groupMeta.length > 0 ? groupMeta.join(' • ') : 'Standard'}
          </div>
        )}
        {showKoPhase && (
          <div className="rounded border border-border bg-background px-3 py-2">
            KO-Phase: {koMeta.length > 0 ? koMeta.join(' • ') : 'Standard'}
          </div>
        )}
      </div>
      {invalidPureKoPairing && (
        <div className="mt-3 rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          Hinweis: P3/P4 ist ohne Gruppenphase im reinen KO-Modus nicht gueltig.
        </div>
      )}
    </div>
  );
}
