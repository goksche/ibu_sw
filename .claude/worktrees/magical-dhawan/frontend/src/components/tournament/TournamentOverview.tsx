// Tournament Overview Tab
import { Tournament } from '../../types';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '../ui/Card';
import TournamentModeVisualization from './TournamentModeVisualization';

interface TournamentOverviewProps {
  tournament: Tournament;
  /** Name des zugewiesenen Spielorts (falls Turnier einen Spielort hat) */
  locationName?: string | null;
}

export default function TournamentOverview({ tournament, locationName }: TournamentOverviewProps) {
  // Labels für Gleichstandsregeln
  const tieBreakingRuleLabels: Record<string, string> = {
    'wins': 'Siege',
    'diff': 'Differenz',
    'goals_for': 'LF',
    'direct_encounter': 'Direktbegegnung',
    'decision_match': 'Entscheidungsspiel'
  };

  // KO-Struktur-Labels
  const koStructureLabels: Record<string, string> = {
    'single_elimination': 'Einfach-KO',
    'single_elimination_with_third': 'Einfach-KO mit Spiel um Platz 3',
    'double_elimination': 'Doppel-KO',
    'group_then_single_ko': 'Gruppenphase mit anschließendem Einfach-KO',
    'group_then_double_ko': 'Gruppenphase mit anschließendem Doppel-KO',
    'ko_with_group_winner_advantage': 'KO mit Vorteil für Gruppensieger',
    'page_playoff': 'Page-Playoff-System'
  };

  // KO-Auslosungsmethode-Labels
  const koDrawMethodLabels: Record<string, string> = {
    'fixed_cross': 'Feste Kreuzpaarung',
    'same_position_cross': 'Platzgleiches Kreuzen',
    'overall_seeding': 'Gesamt-Seeding (Ranglistenbasiert)',
    'pot_system': 'Topf-System (teilweise Zufall)',
    'full_random': 'Vollzufällige Auslosung mit Sperrregeln',
    'bonus_draw_for_winners': 'Bonus-Auslosung für Gruppensieger',
    'predefined_bracket': 'Vorgegebener Turnierbaum',
    'manual': 'Manuell'
  };

  const koDrawModeLabels: Record<string, string> = {
    'random_first_round': 'a) Erste Runde zufällig, danach fester Turnierbaum',
    'random_each_round': 'b) Jede Runde neu zufällig',
    'predefined_slots': 'c) Fester Turnierbaum mit Slot-Bezeichnungen',
    'cross': 'Legacy: Cross',
    'draw': 'Legacy: Draw'
  };

  return (
    <div className="max-w-[1200px] mx-auto">
      {/* Basic Information Card */}
      <Card className="mb-8">
        <CardContent className="p-8">
          <h2 className="mt-0 mb-6 text-2xl font-semibold text-foreground">
            📋 Turnier-Informationen
          </h2>
          
          <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-6">
            <div className="bg-muted p-4 rounded-lg border border-border">
              <div className="text-sm text-muted-foreground mb-2">Name</div>
              <div className="text-lg font-semibold text-foreground">{tournament.name}</div>
            </div>
            
            <div className="bg-muted p-4 rounded-lg border border-border">
              <div className="text-sm text-muted-foreground mb-2">Status</div>
              <div className="text-lg font-semibold text-foreground">
                {tournament.status === 'planned' ? '📅 Geplant' :
                 tournament.status === 'running' ? '▶️ Laufend' :
                 '✅ Abgeschlossen'}
              </div>
            </div>
            
            <div className="bg-muted p-4 rounded-lg border border-border">
              <div className="text-sm text-muted-foreground mb-2">Modus</div>
              <div className="text-lg font-semibold text-foreground">
                {tournament.mode === 'round_robin' ? '🏆 Liga' :
                 tournament.mode === 'knockout' ? '⚔️ KO-Phase' :
                 '🔄 Kombiniert'}
              </div>
            </div>
            
            <div className="bg-muted p-4 rounded-lg border border-border">
              <div className="text-sm text-muted-foreground mb-2">Startdatum</div>
              <div className="text-lg font-semibold text-foreground">{tournament.start_date}</div>
            </div>
            
            {tournament.end_date && (
              <div className="bg-muted p-4 rounded-lg border border-border">
                <div className="text-sm text-muted-foreground mb-2">Enddatum</div>
                <div className="text-lg font-semibold text-foreground">{tournament.end_date}</div>
              </div>
            )}

            <div className="bg-muted p-4 rounded-lg border border-border">
              <div className="text-sm text-muted-foreground mb-2">Spielort</div>
              <div className="text-lg font-semibold text-foreground">
                {locationName || '—'}
              </div>
            </div>
          </div>
          
          {tournament.description && (
            <div className="mt-6 bg-muted p-4 rounded-lg border border-border">
              <div className="text-sm text-muted-foreground mb-2">Beschreibung</div>
              <div className="text-base leading-relaxed text-foreground">{tournament.description}</div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardContent className="p-6">
          <TournamentModeVisualization
            mode={tournament.mode}
            hasGroupPhase={tournament.has_group_phase}
            hasKoPhase={tournament.has_ko_phase}
            groupsCount={tournament.groups_count}
            participantsPerGroup={tournament.participants_per_group}
            groupDistribution={tournament.group_distribution}
            koStartRound={tournament.ko_start_round ?? null}
            koStructure={tournament.ko_structure}
            koDrawMethod={tournament.ko_draw_method}
          />
        </CardContent>
      </Card>

      {/* Tournament Settings */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(500px,1fr))] gap-8">
        {/* Gruppenphase / Liga Card */}
        {(tournament.has_group_phase || tournament.mode === 'round_robin' || tournament.groups_count > 0 || tournament.league_scoring_system || tournament.tie_breaking_rules) && (
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-br from-primary/50 to-primary/60 p-6 text-foreground border-b border-border">
              <h3 className="m-0 text-xl font-semibold">
                👥 Gruppenphase / Liga
              </h3>
              <div className="mt-2 text-sm opacity-90">
                {tournament.has_group_phase || tournament.mode === 'round_robin' ? '✓ Aktiviert' : 'Deaktiviert'}
              </div>
            </div>
            
            <CardContent className="p-6">
              {tournament.groups_count !== undefined && tournament.groups_count !== null && (
                <div className="mb-5 pb-5 border-b border-border">
                  <div className="text-sm text-muted-foreground mb-2 font-medium">
                    Anzahl Gruppen
                  </div>
                  <div className="text-lg text-foreground font-semibold">
                    {tournament.groups_count}
                  </div>
                </div>
              )}
              
              {tournament.participants_per_group && (
                <div className="mb-5 pb-5 border-b border-border">
                  <div className="text-sm text-muted-foreground mb-2 font-medium">
                    Teilnehmer pro Gruppe
                  </div>
                  <div className="text-lg text-foreground font-semibold">
                    {tournament.participants_per_group}
                  </div>
                </div>
              )}
              
              {tournament.group_distribution && (
                <div className="mb-5 pb-5 border-b border-border">
                  <div className="text-sm text-muted-foreground mb-2 font-medium">
                    Auslosungsart
                  </div>
                  <div className="text-lg text-foreground font-semibold mb-2">
                    {tournament.group_distribution === 'random' ? 'Zufällig (Random)' : tournament.group_distribution === 'seeded' ? 'Gesetzt (Seeded)' : tournament.group_distribution}
                  </div>
                  <div className="text-sm text-muted-foreground italic leading-relaxed">
                    {tournament.group_distribution === 'random' 
                      ? 'Teilnehmer werden zufällig auf die Gruppen verteilt'
                      : 'Gesetzte Spieler werden vorab in Gruppen eingeteilt, andere werden zugeordnet'}
                  </div>
                </div>
              )}
              
              {tournament.group_distribution === 'seeded' && tournament.seeded_participant_ids && tournament.seeded_participant_ids.length > 0 && (
                <div className="mb-5 pb-5 border-b border-border">
                  <div className="text-sm text-muted-foreground mb-2 font-medium">
                    Gesetzte Spieler
                  </div>
                  <div className="text-lg text-foreground font-semibold">
                    {tournament.seeded_participant_ids.length} ausgewählt
                  </div>
                </div>
              )}
              
              {tournament.league_scoring_system && (
                <div className="mb-5 pb-5 border-b border-border">
                  <div className="text-sm text-muted-foreground mb-2 font-medium">
                    Ligatabelle Wertung
                  </div>
                  <div className={cn(
                    'inline-block py-2 px-4 rounded-md text-sm font-semibold mb-2',
                    tournament.league_scoring_system === 'points' ? 'bg-success text-success-foreground' : 'bg-info text-info-foreground'
                  )}>
                    {tournament.league_scoring_system === 'points' ? 'Punkte' : 'Differenz'}
                  </div>
                  <div className="text-sm text-muted-foreground italic leading-relaxed">
                    {tournament.league_scoring_system === 'points' 
                      ? 'Rangliste basierend auf Punkten (Sieg: 3 Punkte, Unentschieden: 1 Punkt, Niederlage: 0 Punkte)'
                      : 'Rangliste basierend auf Differenz (Tore/Sätze/Legs für minus gegen)'}
                  </div>
                </div>
              )}
              
              {tournament.mode === 'round_robin' && tournament.league_variant && (
                <div className="mb-5 pb-5 border-b border-border">
                  <div className="text-sm text-muted-foreground mb-2 font-medium">
                    Liga-Variante
                  </div>
                  <div className="text-lg text-foreground font-semibold mb-2">
                    {tournament.league_variant === 'classic' && 'Klassische Liga (Round Robin)'}
                    {tournament.league_variant === 'double' && 'Doppelte Liga'}
                    {tournament.league_variant === 'multiple' && 'Mehrfache Liga'}
                  </div>
                  <div className="text-sm text-muted-foreground italic leading-relaxed">
                    {tournament.league_variant === 'classic' && 'Jeder gegen jeden einmal (Standard Round Robin)'}
                    {tournament.league_variant === 'double' && 'Jeder gegen jeden zweimal (2x Round Robin)'}
                    {tournament.league_variant === 'multiple' && `Jeder gegen jeden ${tournament.league_rounds_multiplier || 1}x (Mehrfache Liga)`}
                  </div>
                  {tournament.league_variant === 'multiple' && tournament.league_rounds_multiplier && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      Multiplikator: {tournament.league_rounds_multiplier}
                    </div>
                  )}
                </div>
              )}
              
              {tournament.tie_breaking_rules && tournament.tie_breaking_rules.length > 0 && (
                <div>
                  <div className="text-sm text-muted-foreground mb-3 font-medium">
                    Gleichstandsregeln
                  </div>
                  <div className="flex flex-col gap-2">
                    {tournament.tie_breaking_rules.map((rule, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 bg-muted rounded-md border border-border">
                        <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold flex-shrink-0">
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <div className="text-[0.9375rem] text-foreground font-medium mb-1">
                            {tieBreakingRuleLabels[rule] || rule}
                          </div>
                          {(rule === 'decision_match' || rule === 'wins' || rule === 'direct_encounter') && (
                            <div className="text-[0.8125rem] text-muted-foreground italic">
                              {rule === 'decision_match' && '(Bei Gleichstand wird ein Entscheidungsspiel generiert)'}
                              {rule === 'wins' && '(Anzahl Siege)'}
                              {rule === 'direct_encounter' && '(Ergebnis der Direktbegegnung)'}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* KO-Phase Card */}
        {(tournament.has_ko_phase || tournament.mode === 'knockout' || tournament.ko_structure || tournament.ko_draw_method || tournament.ko_participants > 0) && (
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-br from-warning/50 to-destructive/60 p-6 text-foreground border-b border-border">
              <h3 className="m-0 text-xl font-semibold">
                ⚔️ KO-Phase
              </h3>
              <div className="mt-2 text-sm opacity-90">
                {tournament.has_ko_phase || tournament.mode === 'knockout' ? '✓ Aktiviert' : 'Deaktiviert'}
              </div>
            </div>
            
            <CardContent className="p-6">
              {tournament.ko_start_round && (
                <div className="mb-5 pb-5 border-b border-border">
                  <div className="text-sm text-muted-foreground mb-2 font-medium">
                    KO-Start-Runde
                  </div>
                  <div className="text-lg text-foreground font-semibold mb-2">
                    {tournament.ko_start_round === 'round_of_32' && 'Sechzehntelfinale (32 Teilnehmer)'}
                    {tournament.ko_start_round === 'round_of_16' && 'Achtelfinale (16 Teilnehmer)'}
                    {tournament.ko_start_round === 'quarterfinal' && 'Viertelfinale (8 Teilnehmer)'}
                    {tournament.ko_start_round === 'semifinal' && 'Halbfinale (4 Teilnehmer)'}
                    {tournament.ko_start_round === 'final' && 'Finale (2 Teilnehmer)'}
                  </div>
                  {tournament.ko_fallback_qualifiers && tournament.ko_fallback_qualifiers.length > 0 && (
                    <div className="mt-3 p-3 bg-info/20 rounded-md border border-info">
                      <div className="text-sm font-bold text-foreground mb-1">
                        Zusätzliche Qualifikanten:
                      </div>
                      {tournament.ko_fallback_qualifiers.map((rule, idx) => (
                        <div key={idx} className="text-sm text-muted-foreground">
                          • {rule.count}x bester {rule.position}. Platzierter
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {/* Legacy: Show ko_participants if ko_start_round not set */}
              {!tournament.ko_start_round && tournament.ko_participants !== undefined && tournament.ko_participants !== null && tournament.ko_participants > 0 && (
                <div className="mb-5 pb-5 border-b border-border">
                  <div className="text-sm text-muted-foreground mb-2 font-medium">
                    {tournament.mode === 'knockout' ? 'Teilnehmer' : 'Teilnehmer aus Gruppenphase'} (Legacy)
                  </div>
                  <div className="text-lg text-foreground font-semibold">
                    {tournament.ko_participants}
                  </div>
                </div>
              )}
              
              {tournament.ko_structure && (
                <div className="mb-5 pb-5 border-b border-border">
                  <div className="text-sm text-muted-foreground mb-2 font-medium">
                    Turnierstruktur
                  </div>
                  <div className="text-lg text-foreground font-semibold mb-2">
                    {koStructureLabels[tournament.ko_structure] || tournament.ko_structure}
                  </div>
                  <div className="text-sm text-muted-foreground italic leading-relaxed">
                    {tournament.ko_structure === 'single_elimination' && 'Wer ein Spiel verliert, ist sofort aus dem Turnier ausgeschieden. Der Gewinner kommt weiter, bis am Ende ein Sieger feststeht.'}
                    {tournament.ko_structure === 'single_elimination_with_third' && 'Neben dem Finale gibt es ein zusätzliches Spiel, um den dritten Platz zu ermitteln.'}
                    {tournament.ko_structure === 'double_elimination' && 'Jeder darf einmal verlieren. Erst beim zweiten verlorenen Spiel scheidet man endgültig aus.'}
                    {tournament.ko_structure === 'group_then_single_ko' && 'Zuerst spielt jeder mehrere Gruppenspiele. Danach kommen die besten Spieler in eine klassische KO-Runde.'}
                    {tournament.ko_structure === 'group_then_double_ko' && 'Nach der Gruppenphase darf man sich auch in der KO-Phase eine Niederlage erlauben.'}
                    {tournament.ko_structure === 'ko_with_group_winner_advantage' && 'Wer seine Gruppe gewinnt, bekommt in der KO-Phase einen Bonus als Belohnung für gute Leistung.'}
                    {tournament.ko_structure === 'page_playoff' && 'Die besten Teilnehmer haben einen Vorteil und dürfen sich eine Niederlage erlauben, die anderen nicht.'}
                  </div>
                </div>
              )}
              
              {tournament.ko_draw_method && (
                <div className="mb-5 pb-5 border-b border-border">
                  <div className="text-sm text-muted-foreground mb-2 font-medium">
                    Auslosung
                  </div>
                  <div className="text-lg text-foreground font-semibold mb-2">
                    {koDrawMethodLabels[tournament.ko_draw_method] || tournament.ko_draw_method}
                  </div>
                  <div className="text-sm text-muted-foreground italic leading-relaxed">
                    {tournament.ko_draw_method === 'fixed_cross' && 'Die Gruppenplätze bestimmen eindeutig, wer gegen wen spielt. Es gibt keine Auslosung.'}
                    {tournament.ko_draw_method === 'same_position_cross' && 'Alle Gruppenersten spielen gegeneinander, alle Gruppenzweiten ebenfalls.'}
                    {tournament.ko_draw_method === 'overall_seeding' && 'Die besten Spieler treten zuerst gegen die schwächeren an, damit starke Spieler später aufeinandertreffen.'}
                    {tournament.ko_draw_method === 'pot_system' && 'Die Spieler werden in Stärketöpfe gelegt und dann mit gewissen Regeln zufällig ausgelost.'}
                    {tournament.ko_draw_method === 'full_random' && 'Alle kommen in einen Topf und werden zufällig gezogen, gewisse Begegnungen sind verboten.'}
                    {tournament.ko_draw_method === 'bonus_draw_for_winners' && 'Wer seine Gruppe gewinnt, bekommt in der ersten KO-Runde bewusst einen leichteren Gegner.'}
                    {tournament.ko_draw_method === 'predefined_bracket' && 'Der Turnierbaum steht schon vorher fest, die Gruppenphase entscheidet nur über die Position darin.'}
                    {tournament.ko_draw_method === 'manual' && 'Paarungen werden im Turnier-Bereich „Spiele" / „KO-Phase" manuell festgelegt (Runde 1 speichern, dann Runde 2, …).'}
                  </div>
                </div>
              )}

              {tournament.ko_distribution && (
                <div className="mb-5 pb-5 border-b border-border">
                  <div className="text-sm text-muted-foreground mb-2 font-medium">
                    KO-Auslosungsmodus
                  </div>
                  <div className="text-lg text-foreground font-semibold mb-2">
                    {koDrawModeLabels[tournament.ko_distribution] || tournament.ko_distribution}
                  </div>
                </div>
              )}
              
              {/* Erste KO-Runde nur anzeigen, wenn keine KO-Start-Runde gesetzt ist (sonst kommt die Info von „KO-Start-Runde") */}
              {!tournament.ko_start_round && tournament.ko_first_round_size && (
                <div className="mb-5 pb-5 border-b border-border">
                  <div className="text-sm text-muted-foreground mb-2 font-medium">
                    Erste KO-Runde
                  </div>
                  <div className="text-lg text-foreground font-semibold">
                    Top {tournament.ko_first_round_size}
                  </div>
                </div>
              )}
              
              {tournament.ko_third_place_match && (
                <div className="mb-5 p-3 bg-success/20 rounded-md border border-success">
                  <div className="text-sm text-success font-medium">
                    ✓ Spiel um Platz 3 aktiviert
                  </div>
                </div>
              )}
              
              {tournament.ko_group_winner_advantage && (
                <div className="mb-5 p-3 bg-success/20 rounded-md border border-success">
                  <div className="text-sm text-success font-medium">
                    ✓ Vorteil für Gruppensieger aktiviert
                  </div>
                </div>
              )}
              
              {(tournament.ko_block_same_group || tournament.ko_block_same_position) && (
                <div className="mb-5 pb-5 border-b border-border">
                  <div className="text-sm text-muted-foreground mb-3 font-medium">
                    Sperrregeln
                  </div>
                  <div className="flex flex-col gap-2">
                    {tournament.ko_block_same_group && (
                      <div className="p-3 bg-warning/20 rounded-md border border-warning text-sm text-warning">
                        • Keine Paarungen aus derselben Gruppe
                      </div>
                    )}
                    {tournament.ko_block_same_position && (
                      <div className="p-3 bg-warning/20 rounded-md border border-warning text-sm text-warning">
                        • Keine Paarungen mit gleicher {tournament.mode === 'knockout' ? 'Setzung/Platzierung' : 'Gruppenplatzierung'}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {tournament.ko_random_seed !== undefined && tournament.ko_random_seed !== null && (
                <div>
                  <div className="text-sm text-muted-foreground mb-2 font-medium">
                    Zufalls-Seed
                  </div>
                  <div className="text-lg text-foreground font-semibold">
                    {tournament.ko_random_seed}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
