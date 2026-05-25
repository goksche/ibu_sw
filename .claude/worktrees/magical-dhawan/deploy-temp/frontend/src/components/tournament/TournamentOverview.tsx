// Tournament Overview Tab
import { Tournament } from '../../types';

interface TournamentOverviewProps {
  tournament: Tournament;
}

export default function TournamentOverview({ tournament }: TournamentOverviewProps) {
  // Labels für Gleichstandsregeln
  const tieBreakingRuleLabels: Record<string, string> = {
    'wins': 'Siege',
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
    'predefined_bracket': 'Vorgegebener Turnierbaum'
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Basic Information Card */}
      <div style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '2rem',
        borderRadius: '12px',
        marginBottom: '2rem',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        color: 'white'
      }}>
        <h2 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.75rem', fontWeight: '600' }}>
          📋 Turnier-Informationen
        </h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.2)', padding: '1rem', borderRadius: '8px', backdropFilter: 'blur(10px)' }}>
            <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.5rem' }}>Name</div>
            <div style={{ fontSize: '1.125rem', fontWeight: '600' }}>{tournament.name}</div>
          </div>
          
          <div style={{ background: 'rgba(255, 255, 255, 0.2)', padding: '1rem', borderRadius: '8px', backdropFilter: 'blur(10px)' }}>
            <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.5rem' }}>Status</div>
            <div style={{ fontSize: '1.125rem', fontWeight: '600' }}>
              {tournament.status === 'planned' ? '📅 Geplant' :
               tournament.status === 'running' ? '▶️ Laufend' :
               '✅ Abgeschlossen'}
            </div>
          </div>
          
          <div style={{ background: 'rgba(255, 255, 255, 0.2)', padding: '1rem', borderRadius: '8px', backdropFilter: 'blur(10px)' }}>
            <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.5rem' }}>Modus</div>
            <div style={{ fontSize: '1.125rem', fontWeight: '600' }}>
              {tournament.mode === 'round_robin' ? '🏆 Liga' :
               tournament.mode === 'knockout' ? '⚔️ KO-Phase' :
               '🔄 Kombiniert'}
            </div>
          </div>
          
          <div style={{ background: 'rgba(255, 255, 255, 0.2)', padding: '1rem', borderRadius: '8px', backdropFilter: 'blur(10px)' }}>
            <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.5rem' }}>Startdatum</div>
            <div style={{ fontSize: '1.125rem', fontWeight: '600' }}>{tournament.start_date}</div>
          </div>
          
          {tournament.end_date && (
            <div style={{ background: 'rgba(255, 255, 255, 0.2)', padding: '1rem', borderRadius: '8px', backdropFilter: 'blur(10px)' }}>
              <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.5rem' }}>Enddatum</div>
              <div style={{ fontSize: '1.125rem', fontWeight: '600' }}>{tournament.end_date}</div>
            </div>
          )}
        </div>
        
        {tournament.description && (
          <div style={{ marginTop: '1.5rem', background: 'rgba(255, 255, 255, 0.2)', padding: '1rem', borderRadius: '8px', backdropFilter: 'blur(10px)' }}>
            <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.5rem' }}>Beschreibung</div>
            <div style={{ fontSize: '1rem', lineHeight: '1.5' }}>{tournament.description}</div>
          </div>
        )}
      </div>

      {/* Tournament Settings */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '2rem' }}>
        {/* Gruppenphase / Liga Card */}
        {(tournament.has_group_phase || tournament.mode === 'round_robin' || tournament.groups_count > 0 || tournament.league_scoring_system || tournament.tie_breaking_rules) && (
          <div style={{
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              padding: '1.5rem',
              color: 'white'
            }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>
                👥 Gruppenphase / Liga
              </h3>
              <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', opacity: 0.9 }}>
                {tournament.has_group_phase || tournament.mode === 'round_robin' ? '✓ Aktiviert' : 'Deaktiviert'}
              </div>
            </div>
            
            <div style={{ padding: '1.5rem' }}>
              {tournament.groups_count !== undefined && tournament.groups_count !== null && (
                <div style={{ marginBottom: '1.25rem', paddingBottom: '1.25rem', borderBottom: '1px solid #e9ecef' }}>
                  <div style={{ fontSize: '0.875rem', color: '#6c757d', marginBottom: '0.5rem', fontWeight: '500' }}>
                    Anzahl Gruppen
                  </div>
                  <div style={{ fontSize: '1.125rem', color: '#212529', fontWeight: '600' }}>
                    {tournament.groups_count}
                  </div>
                </div>
              )}
              
              {tournament.participants_per_group && (
                <div style={{ marginBottom: '1.25rem', paddingBottom: '1.25rem', borderBottom: '1px solid #e9ecef' }}>
                  <div style={{ fontSize: '0.875rem', color: '#6c757d', marginBottom: '0.5rem', fontWeight: '500' }}>
                    Teilnehmer pro Gruppe
                  </div>
                  <div style={{ fontSize: '1.125rem', color: '#212529', fontWeight: '600' }}>
                    {tournament.participants_per_group}
                  </div>
                </div>
              )}
              
              {tournament.group_distribution && (
                <div style={{ marginBottom: '1.25rem', paddingBottom: '1.25rem', borderBottom: '1px solid #e9ecef' }}>
                  <div style={{ fontSize: '0.875rem', color: '#6c757d', marginBottom: '0.5rem', fontWeight: '500' }}>
                    Auslosungsart
                  </div>
                  <div style={{ fontSize: '1.125rem', color: '#212529', fontWeight: '600', marginBottom: '0.5rem' }}>
                    {tournament.group_distribution === 'random' ? 'Zufällig (Random)' : tournament.group_distribution === 'seeded' ? 'Gesetzt (Seeded)' : tournament.group_distribution}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#6c757d', fontStyle: 'italic', lineHeight: '1.5' }}>
                    {tournament.group_distribution === 'random' 
                      ? 'Teilnehmer werden zufällig auf die Gruppen verteilt'
                      : 'Gesetzte Spieler werden vorab in Gruppen eingeteilt, andere werden zugeordnet'}
                  </div>
                </div>
              )}
              
              {tournament.group_distribution === 'seeded' && tournament.seeded_participant_ids && tournament.seeded_participant_ids.length > 0 && (
                <div style={{ marginBottom: '1.25rem', paddingBottom: '1.25rem', borderBottom: '1px solid #e9ecef' }}>
                  <div style={{ fontSize: '0.875rem', color: '#6c757d', marginBottom: '0.5rem', fontWeight: '500' }}>
                    Gesetzte Spieler
                  </div>
                  <div style={{ fontSize: '1.125rem', color: '#212529', fontWeight: '600' }}>
                    {tournament.seeded_participant_ids.length} ausgewählt
                  </div>
                </div>
              )}
              
              {tournament.league_scoring_system && (
                <div style={{ marginBottom: '1.25rem', paddingBottom: '1.25rem', borderBottom: '1px solid #e9ecef' }}>
                  <div style={{ fontSize: '0.875rem', color: '#6c757d', marginBottom: '0.5rem', fontWeight: '500' }}>
                    Ligatabelle Wertung
                  </div>
                  <div style={{ 
                    display: 'inline-block',
                    background: tournament.league_scoring_system === 'points' ? '#28a745' : '#17a2b8',
                    color: 'white',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    marginBottom: '0.5rem'
                  }}>
                    {tournament.league_scoring_system === 'points' ? 'Punkte' : 'Differenz'}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#6c757d', fontStyle: 'italic', lineHeight: '1.5' }}>
                    {tournament.league_scoring_system === 'points' 
                      ? 'Rangliste basierend auf Punkten (Sieg: 3 Punkte, Unentschieden: 1 Punkt, Niederlage: 0 Punkte)'
                      : 'Rangliste basierend auf Differenz (Tore/Sätze/Legs für minus gegen)'}
                  </div>
                </div>
              )}
              
              {tournament.mode === 'round_robin' && tournament.league_variant && (
                <div style={{ marginBottom: '1.25rem', paddingBottom: '1.25rem', borderBottom: '1px solid #e9ecef' }}>
                  <div style={{ fontSize: '0.875rem', color: '#6c757d', marginBottom: '0.5rem', fontWeight: '500' }}>
                    Liga-Variante
                  </div>
                  <div style={{ fontSize: '1.125rem', color: '#212529', fontWeight: '600', marginBottom: '0.5rem' }}>
                    {tournament.league_variant === 'classic' && 'Klassische Liga (Round Robin)'}
                    {tournament.league_variant === 'double' && 'Doppelte Liga'}
                    {tournament.league_variant === 'multiple' && 'Mehrfache Liga'}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#6c757d', fontStyle: 'italic', lineHeight: '1.5' }}>
                    {tournament.league_variant === 'classic' && 'Jeder gegen jeden einmal (Standard Round Robin)'}
                    {tournament.league_variant === 'double' && 'Jeder gegen jeden zweimal (2x Round Robin)'}
                    {tournament.league_variant === 'multiple' && `Jeder gegen jeden ${tournament.league_rounds_multiplier || 1}x (Mehrfache Liga)`}
                  </div>
                  {tournament.league_variant === 'multiple' && tournament.league_rounds_multiplier && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#495057' }}>
                      Multiplikator: {tournament.league_rounds_multiplier}
                    </div>
                  )}
                </div>
              )}
              
              {tournament.tie_breaking_rules && tournament.tie_breaking_rules.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.875rem', color: '#6c757d', marginBottom: '0.75rem', fontWeight: '500' }}>
                    Gleichstandsregeln
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {tournament.tie_breaking_rules.map((rule, idx) => (
                      <div key={idx} style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.75rem',
                        padding: '0.75rem',
                        background: '#f8f9fa',
                        borderRadius: '6px',
                        border: '1px solid #dee2e6'
                      }}>
                        <div style={{
                          background: '#667eea',
                          color: 'white',
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          flexShrink: 0
                        }}>
                          {idx + 1}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.9375rem', color: '#212529', fontWeight: '500', marginBottom: '0.25rem' }}>
                            {tieBreakingRuleLabels[rule] || rule}
                          </div>
                          {(rule === 'decision_match' || rule === 'wins' || rule === 'direct_encounter') && (
                            <div style={{ fontSize: '0.8125rem', color: '#6c757d', fontStyle: 'italic' }}>
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
            </div>
          </div>
        )}

        {/* KO-Phase Card */}
        {(tournament.has_ko_phase || tournament.mode === 'knockout' || tournament.ko_structure || tournament.ko_draw_method || tournament.ko_participants > 0) && (
          <div style={{
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
              padding: '1.5rem',
              color: 'white'
            }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>
                ⚔️ KO-Phase
              </h3>
              <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', opacity: 0.9 }}>
                {tournament.has_ko_phase || tournament.mode === 'knockout' ? '✓ Aktiviert' : 'Deaktiviert'}
              </div>
            </div>
            
            <div style={{ padding: '1.5rem' }}>
              {tournament.ko_participants !== undefined && tournament.ko_participants !== null && tournament.ko_participants > 0 && (
                <div style={{ marginBottom: '1.25rem', paddingBottom: '1.25rem', borderBottom: '1px solid #e9ecef' }}>
                  <div style={{ fontSize: '0.875rem', color: '#6c757d', marginBottom: '0.5rem', fontWeight: '500' }}>
                    {tournament.mode === 'knockout' ? 'Teilnehmer' : 'Teilnehmer aus Gruppenphase'}
                  </div>
                  <div style={{ fontSize: '1.125rem', color: '#212529', fontWeight: '600' }}>
                    {tournament.ko_participants}
                  </div>
                </div>
              )}
              
              {tournament.ko_structure && (
                <div style={{ marginBottom: '1.25rem', paddingBottom: '1.25rem', borderBottom: '1px solid #e9ecef' }}>
                  <div style={{ fontSize: '0.875rem', color: '#6c757d', marginBottom: '0.5rem', fontWeight: '500' }}>
                    Turnierstruktur
                  </div>
                  <div style={{ fontSize: '1.125rem', color: '#212529', fontWeight: '600', marginBottom: '0.5rem' }}>
                    {koStructureLabels[tournament.ko_structure] || tournament.ko_structure}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#6c757d', fontStyle: 'italic', lineHeight: '1.5' }}>
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
                <div style={{ marginBottom: '1.25rem', paddingBottom: '1.25rem', borderBottom: '1px solid #e9ecef' }}>
                  <div style={{ fontSize: '0.875rem', color: '#6c757d', marginBottom: '0.5rem', fontWeight: '500' }}>
                    Auslosung
                  </div>
                  <div style={{ fontSize: '1.125rem', color: '#212529', fontWeight: '600', marginBottom: '0.5rem' }}>
                    {koDrawMethodLabels[tournament.ko_draw_method] || tournament.ko_draw_method}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#6c757d', fontStyle: 'italic', lineHeight: '1.5' }}>
                    {tournament.ko_draw_method === 'fixed_cross' && 'Die Gruppenplätze bestimmen eindeutig, wer gegen wen spielt. Es gibt keine Auslosung.'}
                    {tournament.ko_draw_method === 'same_position_cross' && 'Alle Gruppenersten spielen gegeneinander, alle Gruppenzweiten ebenfalls.'}
                    {tournament.ko_draw_method === 'overall_seeding' && 'Die besten Spieler treten zuerst gegen die schwächeren an, damit starke Spieler später aufeinandertreffen.'}
                    {tournament.ko_draw_method === 'pot_system' && 'Die Spieler werden in Stärketöpfe gelegt und dann mit gewissen Regeln zufällig ausgelost.'}
                    {tournament.ko_draw_method === 'full_random' && 'Alle kommen in einen Topf und werden zufällig gezogen, gewisse Begegnungen sind verboten.'}
                    {tournament.ko_draw_method === 'bonus_draw_for_winners' && 'Wer seine Gruppe gewinnt, bekommt in der ersten KO-Runde bewusst einen leichteren Gegner.'}
                    {tournament.ko_draw_method === 'predefined_bracket' && 'Der Turnierbaum steht schon vorher fest, die Gruppenphase entscheidet nur über die Position darin.'}
                  </div>
                </div>
              )}
              
              {tournament.ko_first_round_size && (
                <div style={{ marginBottom: '1.25rem', paddingBottom: '1.25rem', borderBottom: '1px solid #e9ecef' }}>
                  <div style={{ fontSize: '0.875rem', color: '#6c757d', marginBottom: '0.5rem', fontWeight: '500' }}>
                    Erste KO-Runde
                  </div>
                  <div style={{ fontSize: '1.125rem', color: '#212529', fontWeight: '600' }}>
                    Top {tournament.ko_first_round_size}
                  </div>
                </div>
              )}
              
              {tournament.ko_third_place_match && (
                <div style={{ 
                  marginBottom: '1.25rem', 
                  padding: '0.75rem',
                  background: '#d4edda',
                  borderRadius: '6px',
                  border: '1px solid #c3e6cb'
                }}>
                  <div style={{ fontSize: '0.875rem', color: '#155724', fontWeight: '500' }}>
                    ✓ Spiel um Platz 3 aktiviert
                  </div>
                </div>
              )}
              
              {tournament.ko_group_winner_advantage && (
                <div style={{ 
                  marginBottom: '1.25rem', 
                  padding: '0.75rem',
                  background: '#d4edda',
                  borderRadius: '6px',
                  border: '1px solid #c3e6cb'
                }}>
                  <div style={{ fontSize: '0.875rem', color: '#155724', fontWeight: '500' }}>
                    ✓ Vorteil für Gruppensieger aktiviert
                  </div>
                </div>
              )}
              
              {(tournament.ko_block_same_group || tournament.ko_block_same_position) && (
                <div style={{ marginBottom: '1.25rem', paddingBottom: '1.25rem', borderBottom: '1px solid #e9ecef' }}>
                  <div style={{ fontSize: '0.875rem', color: '#6c757d', marginBottom: '0.75rem', fontWeight: '500' }}>
                    Sperrregeln
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {tournament.ko_block_same_group && (
                      <div style={{
                        padding: '0.75rem',
                        background: '#fff3cd',
                        borderRadius: '6px',
                        border: '1px solid #ffeaa7',
                        fontSize: '0.875rem',
                        color: '#856404'
                      }}>
                        • Keine Paarungen aus derselben Gruppe
                      </div>
                    )}
                    {tournament.ko_block_same_position && (
                      <div style={{
                        padding: '0.75rem',
                        background: '#fff3cd',
                        borderRadius: '6px',
                        border: '1px solid #ffeaa7',
                        fontSize: '0.875rem',
                        color: '#856404'
                      }}>
                        • Keine Paarungen mit gleicher {tournament.mode === 'knockout' ? 'Setzung/Platzierung' : 'Gruppenplatzierung'}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {tournament.ko_random_seed !== undefined && tournament.ko_random_seed !== null && (
                <div>
                  <div style={{ fontSize: '0.875rem', color: '#6c757d', marginBottom: '0.5rem', fontWeight: '500' }}>
                    Zufalls-Seed
                  </div>
                  <div style={{ fontSize: '1.125rem', color: '#212529', fontWeight: '600' }}>
                    {tournament.ko_random_seed}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
