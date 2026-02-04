// Live Ticker Page
import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { tournamentService } from '../services/tournamentService';
import { participantService } from '../services/participantService';
import { groupService, GroupWithParticipants } from '../services/groupService';
import { matchService, GroupMatch, KnockoutMatch } from '../services/matchService';
import { tableService, GroupTable, TieBreakMiniTable } from '../services/tableService';
import { qualificationService, QualificationTable } from '../services/qualificationService';
import { locationService } from '../services/locationService';
import { Participant, Tournament } from '../types';
import { theme } from '../theme/theme';
import KOBracket from '../components/tournament/KOBracket';

type Slide =
  | { type: 'title' }
  | { type: 'group'; group: GroupWithParticipants; matches: GroupMatch[]; table: GroupTable | null }
  | { type: 'ko-matches'; matches: KnockoutMatch[] }
  | { type: 'qualification'; table: QualificationTable };

const SLIDE_DURATION_MS = 15000;
const REFRESH_MS = 30000;

export default function LiveTicker() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const tournamentId = id ? parseInt(id) : 0;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [spielfeldIdToName, setSpielfeldIdToName] = useState<Record<number, string>>({});
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [groups, setGroups] = useState<GroupWithParticipants[]>([]);
  const [groupMatches, setGroupMatches] = useState<Record<number, GroupMatch[]>>({});
  const [groupTables, setGroupTables] = useState<Record<number, GroupTable>>({});
  const [koMatches, setKoMatches] = useState<KnockoutMatch[]>([]);
  const [qualificationTable, setQualificationTable] = useState<QualificationTable | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
  }, [isAuthenticated, navigate]);

  const getParticipantNameById = (participantId: number | null): string => {
    if (!participantId) return '-';
    const participant = participants.find(p => p.id === participantId);
    return participant ? `${participant.first_name} ${participant.last_name}` : `ID ${participantId}`;
  };

  const loadData = async () => {
    try {
      const tournamentData = await tournamentService.getById(tournamentId);
      setTournament(tournamentData);

      const map: Record<number, string> = {};
      if (tournamentData.location_id) {
        try {
          const loc = await locationService.getById(tournamentData.location_id);
          (loc.spielfelder || []).forEach(s => { map[s.id] = s.name; });
        } catch { /* ignore */ }
      }
      setSpielfeldIdToName(map);

      const participantsData = await participantService.getTournamentParticipants(tournamentId);
      setParticipants(participantsData);

      let groupsData: GroupWithParticipants[] = [];
      const groupMatchesMap: Record<number, GroupMatch[]> = {};
      const groupTablesMap: Record<number, GroupTable> = {};

      if (tournamentData.has_group_phase) {
        const groupsList = await groupService.getGroups(tournamentId);
        groupsData = await Promise.all(groupsList.map(g => groupService.getGroup(g.id)));

        await Promise.all(
          groupsData.map(async (group) => {
            const matches = await matchService.getGroupMatches(tournamentId, group.id);
            groupMatchesMap[group.id] = matches;
            try {
              const table = await tableService.getGroupTable(group.id);
              groupTablesMap[group.id] = table;
            } catch (err) {
              console.warn('Group table not available:', err);
            }
          })
        );
      }

      setGroups(groupsData);
      setGroupMatches(groupMatchesMap);
      setGroupTables(groupTablesMap);

      if (tournamentData.has_ko_phase) {
        const koData = await matchService.getKnockoutMatches(tournamentId);
        setKoMatches(koData);
      } else {
        setKoMatches([]);
      }

      if (tournamentData.has_group_phase && tournamentData.has_ko_phase && tournamentData.ko_start_round) {
        try {
          const qualTable = await qualificationService.getQualificationTable(tournamentId);
          setQualificationTable(qualTable);
        } catch (err) {
          console.warn('Qualification table not available:', err);
          setQualificationTable(null);
        }
      } else {
        setQualificationTable(null);
      }
    } catch (err) {
      console.error('Failed to load live ticker data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tournamentId) {
      loadData();
    }
  }, [tournamentId]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadData();
    }, REFRESH_MS);
    return () => clearInterval(interval);
  }, [tournamentId]);

  useEffect(() => {
    const newSlides: Slide[] = [{ type: 'title' }];

    groups.forEach(group => {
      const matches = groupMatches[group.id] || [];
      const table = groupTables[group.id] || null;
      if (matches.length > 0 || table) {
        newSlides.push({ type: 'group', group, matches, table });
      }
    });

    if (qualificationTable) {
      newSlides.push({ type: 'qualification', table: qualificationTable });
    }

    if (koMatches.length > 0) {
      newSlides.push({ type: 'ko-matches', matches: koMatches });
    }

    setSlides(newSlides);
  }, [groups, groupMatches, groupTables, koMatches, qualificationTable]);

  useEffect(() => {
    setCurrentIndex(0);
  }, [tournamentId]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % slides.length);
    }, SLIDE_DURATION_MS);
    return () => clearInterval(interval);
  }, [slides]);

  const currentSlide = slides[currentIndex];

  const goNext = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % Math.max(1, slides.length));
  }, [slides.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex(prev => (prev - 1 + slides.length) % Math.max(1, slides.length));
  }, [slides.length]);

  const renderHeader = (title: string, subtitle?: string) => (
    <div style={{ marginBottom: '1.5rem' }}>
      <div style={{ fontSize: '2rem', fontWeight: 'bold', color: theme.colors.text.primary }}>{title}</div>
      {subtitle && (
        <div style={{ marginTop: '0.5rem', color: theme.colors.text.secondary, fontSize: '1.125rem' }}>{subtitle}</div>
      )}
    </div>
  );

  const renderGroupMatches = (group: GroupWithParticipants, matches: GroupMatch[]) => {
    const ordered = matches
      .slice()
      .sort((a, b) => (a.round - b.round) || (a.match_no - b.match_no));

    return (
      <div>
        {renderHeader(`Spielplan - ${group.name}`, `${ordered.length} Spiele`)}
        <div style={{ background: theme.colors.background.card, borderRadius: theme.borderRadius.card, overflow: 'hidden', border: `1px solid ${theme.colors.border.standard}` }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: theme.colors.background.secondary }}>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Spiel</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Spielfeld</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Spieler 1</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Spieler 2</th>
                <th style={{ padding: '0.75rem', textAlign: 'center' }}>Ergebnis</th>
              </tr>
            </thead>
            <tbody>
              {ordered.map((match, idx) => (
                <tr key={match.id} style={{ background: idx % 2 === 0 ? theme.colors.background.card : theme.colors.background.secondary }}>
                  <td style={{ padding: '0.75rem' }}>Spiel {match.match_no}{match.is_decision_match ? ' (Entsch.)' : ''}</td>
                  <td style={{ padding: '0.75rem' }}>{match.spielfeld_id ? (spielfeldIdToName[match.spielfeld_id] ?? `#${match.spielfeld_id}`) : '-'}</td>
                  <td style={{ padding: '0.75rem' }}>{getParticipantNameById(match.player1_id)}</td>
                  <td style={{ padding: '0.75rem' }}>{getParticipantNameById(match.player2_id)}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold' }}>
                    {match.score1 !== null && match.score2 !== null ? `${match.score1} : ${match.score2}` : '- : -'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderGroupTable = (table: GroupTable) => {
    const usePoints = tournament?.league_scoring_system === 'points';
    return (
      <div>
        <div style={{ background: theme.colors.background.card, border: `1px solid ${theme.colors.border.standard}`, borderRadius: theme.borderRadius.card, overflow: 'hidden' }}>
          <h3 style={{ padding: '1rem', background: theme.colors.accent.primary, color: theme.colors.background.primary, margin: 0 }}>
            {table.group_name}
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: theme.colors.background.secondary }}>
                <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: `2px solid ${theme.colors.border.standard}`, color: theme.colors.text.primary }}>Rang</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: `2px solid ${theme.colors.border.standard}`, color: theme.colors.text.primary }}>Spieler</th>
                <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: `2px solid ${theme.colors.border.standard}`, color: theme.colors.text.primary }}>Sp</th>
                <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: `2px solid ${theme.colors.border.standard}`, color: theme.colors.text.primary }}>S</th>
                <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: `2px solid ${theme.colors.border.standard}`, color: theme.colors.text.primary }}>U</th>
                <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: `2px solid ${theme.colors.border.standard}`, color: theme.colors.text.primary }}>N</th>
                <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: `2px solid ${theme.colors.border.standard}`, color: theme.colors.text.primary }}>LF</th>
                <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: `2px solid ${theme.colors.border.standard}`, color: theme.colors.text.primary }}>LA</th>
                <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: `2px solid ${theme.colors.border.standard}`, fontWeight: 'bold', color: theme.colors.text.primary }}>Diff</th>
                {usePoints && (
                  <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: `2px solid ${theme.colors.border.standard}`, fontWeight: 'bold', color: theme.colors.text.primary }}>Pkt</th>
                )}
              </tr>
            </thead>
            <tbody>
              {table.table.map((row, idx) => (
                <tr key={row.participant_id} style={{ borderBottom: `1px solid ${theme.colors.border.standard}`, background: idx % 2 === 0 ? theme.colors.background.card : theme.colors.background.secondary }}>
                  <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: idx < 2 ? 'bold' : 'normal', color: idx < 2 ? theme.colors.accent.info : theme.colors.text.primary }}>{row.rank}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'left', color: theme.colors.text.primary }}>
                    {row.name}
                    {row.won_decision_match === true && (
                      <span style={{ color: theme.colors.accent.success, fontWeight: 'bold', marginLeft: '0.25rem' }} title="Gewinner des Entscheidungsspiels">*</span>
                    )}
                    {row.is_in_tie_group && row.tie_group_size && (
                      <span style={{ fontSize: '0.75rem', color: theme.colors.text.secondary, marginLeft: '0.25rem' }} title={`Gleichstand mit ${row.tie_group_size} Teilnehmern`}>
                        ({row.tie_group_size})
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'center', color: theme.colors.text.primary }}>{row.games}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'center', color: theme.colors.text.primary }}>{row.wins}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'center', color: theme.colors.text.primary }}>{(row as any).draws ?? 0}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'center', color: theme.colors.text.primary }}>{row.losses}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'center', color: theme.colors.text.primary }}>{row.goals_for}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'center', color: theme.colors.text.primary }}>{row.goals_against}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold', color: row.diff > 0 ? theme.colors.accent.success : row.diff < 0 ? theme.colors.accent.error : theme.colors.text.primary }}>
                    {row.diff > 0 ? '+' : ''}{row.diff}
                  </td>
                  {usePoints && (
                    <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold', color: theme.colors.accent.info }}>{row.points ?? 0}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {table.tie_break_mini_tables && table.tie_break_mini_tables.length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            {table.tie_break_mini_tables.map((tieTable: TieBreakMiniTable, tableIndex: number) => (
              <div key={tableIndex} style={{ marginTop: '1rem', background: theme.colors.background.card, border: `1px solid ${theme.colors.border.standard}`, borderRadius: theme.borderRadius.card, overflow: 'hidden' }}>
                <div style={{ padding: '0.75rem 1rem', background: theme.colors.background.secondary, borderBottom: `1px solid ${theme.colors.border.standard}`, fontSize: '0.875rem', fontWeight: 'bold', color: theme.colors.text.primary }}>
                  Direktbegegnungen (Minitabelle) - Gleichstand mit {tieTable.participant_ids.length} Teilnehmern
                  {tieTable.is_completely_tied && (
                    <span style={{ fontSize: '0.75rem', color: theme.colors.accent.error, fontWeight: 'normal', marginLeft: '0.5rem' }}> - Komplett identisch!</span>
                  )}
                </div>
                <div style={{ padding: '1rem' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ background: theme.colors.background.secondary }}>
                        <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: `1px solid ${theme.colors.border.standard}`, color: theme.colors.text.primary }}>Spieler</th>
                        <th style={{ padding: '0.5rem', textAlign: 'center', borderBottom: `1px solid ${theme.colors.border.standard}`, color: theme.colors.text.primary }}>Sp</th>
                        <th style={{ padding: '0.5rem', textAlign: 'center', borderBottom: `1px solid ${theme.colors.border.standard}`, color: theme.colors.text.primary }}>S</th>
                        <th style={{ padding: '0.5rem', textAlign: 'center', borderBottom: `1px solid ${theme.colors.border.standard}`, color: theme.colors.text.primary }}>U</th>
                        <th style={{ padding: '0.5rem', textAlign: 'center', borderBottom: `1px solid ${theme.colors.border.standard}`, color: theme.colors.text.primary }}>N</th>
                        <th style={{ padding: '0.5rem', textAlign: 'center', borderBottom: `1px solid ${theme.colors.border.standard}`, color: theme.colors.text.primary }}>LF</th>
                        <th style={{ padding: '0.5rem', textAlign: 'center', borderBottom: `1px solid ${theme.colors.border.standard}`, color: theme.colors.text.primary }}>LA</th>
                        <th style={{ padding: '0.5rem', textAlign: 'center', borderBottom: `1px solid ${theme.colors.border.standard}`, fontWeight: 'bold', color: theme.colors.text.primary }}>Diff</th>
                        {usePoints && (
                          <th style={{ padding: '0.5rem', textAlign: 'center', borderBottom: `1px solid ${theme.colors.border.standard}`, fontWeight: 'bold', color: theme.colors.text.primary }}>Pkt</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {tieTable.mini_table.map((miniRow, miniIdx) => (
                        <tr key={miniRow.participant_id} style={{ borderBottom: `1px solid ${theme.colors.border.standard}`, background: miniIdx % 2 === 0 ? theme.colors.background.card : theme.colors.background.secondary }}>
                          <td style={{ padding: '0.5rem', textAlign: 'left', color: theme.colors.text.primary, fontWeight: '500' }}>{miniRow.name}</td>
                          <td style={{ padding: '0.5rem', textAlign: 'center', color: theme.colors.text.primary }}>{miniRow.games}</td>
                          <td style={{ padding: '0.5rem', textAlign: 'center', color: theme.colors.text.primary }}>{miniRow.wins}</td>
                          <td style={{ padding: '0.5rem', textAlign: 'center', color: theme.colors.text.primary }}>{miniRow.draws}</td>
                          <td style={{ padding: '0.5rem', textAlign: 'center', color: theme.colors.text.primary }}>{miniRow.losses}</td>
                          <td style={{ padding: '0.5rem', textAlign: 'center', color: theme.colors.text.primary }}>{miniRow.goals_for}</td>
                          <td style={{ padding: '0.5rem', textAlign: 'center', color: theme.colors.text.primary }}>{miniRow.goals_against}</td>
                          <td style={{ padding: '0.5rem', textAlign: 'center', fontWeight: 'bold', color: miniRow.diff > 0 ? theme.colors.accent.success : miniRow.diff < 0 ? theme.colors.accent.error : theme.colors.text.primary }}>
                            {miniRow.diff > 0 ? '+' : ''}{miniRow.diff}
                          </td>
                          {usePoints && (
                            <td style={{ padding: '0.5rem', textAlign: 'center', fontWeight: 'bold', color: theme.colors.accent.info }}>{miniRow.points ?? 0}</td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderQualification = (table: QualificationTable) => {
    const usePoints = tournament?.league_scoring_system === 'points';
    return (
      <div>
        <div style={{
          background: theme.colors.background.card,
          border: `1px solid ${theme.colors.border.standard}`,
          borderRadius: theme.borderRadius.card,
          padding: '1.5rem'
        }}>
          <h3 style={{
            marginTop: 0,
            marginBottom: '1rem',
            color: theme.colors.text.primary,
            borderBottom: `2px solid ${theme.colors.accent.warning}`,
            paddingBottom: '0.5rem'
          }}>
            {'Qualifikations\u00FCbersicht'}
          </h3>
          <div style={{ marginBottom: '1.5rem', color: theme.colors.text.secondary, fontSize: '0.875rem' }}>
            <div><strong>Qualifikationsplan:</strong></div>
            <div>Basis pro Gruppe: {table.basis_per_group}</div>
            <div>Gesamt qualifiziert: {table.qualified_count}</div>
            {table.qualification_plan.remainder > 0 && (
              <div style={{ color: theme.colors.accent.warning, marginTop: '0.5rem' }}>
                Es qualifizieren sich zusätzlich die besten {table.qualification_plan.remainder} Teilnehmer
                aus Position {table.basis_per_group + 1}
              </div>
            )}
          </div>
          <div style={{ marginBottom: '2rem' }}>
            <h4 style={{ color: theme.colors.text.primary, marginBottom: '1rem' }}>Qualifizierte Teilnehmer (Basis)</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
              {table.group_qualifiers.map((groupQual) => (
                <div key={groupQual.group_id} style={{
                  background: theme.colors.background.secondary,
                  border: `1px solid ${theme.colors.border.standard}`,
                  borderRadius: theme.borderRadius.card,
                  padding: '1rem'
                }}>
                  <h5 style={{ marginTop: 0, marginBottom: '0.75rem', color: theme.colors.accent.primary, fontSize: '1rem' }}>
                    {groupQual.group_name}
                  </h5>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {groupQual.basis_qualifiers.map((qualifier) => (
                      <div key={qualifier.participant_id} style={{
                        padding: '0.5rem',
                        background: theme.colors.background.card,
                        borderRadius: theme.borderRadius.input,
                        border: `1px solid ${qualifier.qualified ? theme.colors.accent.success : theme.colors.border.standard}`,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div>
                          <span style={{ fontWeight: 'bold', color: theme.colors.text.primary, marginRight: '0.5rem' }}>{qualifier.position}.</span>
                          <span style={{ color: theme.colors.text.primary }}>{qualifier.name}</span>
                          {qualifier.qualified && (
                            <span style={{ color: theme.colors.accent.success, fontWeight: 'bold', marginLeft: '0.5rem' }}>✓</span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: theme.colors.text.secondary }}>
                          Diff: {qualifier.stats.diff > 0 ? '+' : ''}{qualifier.stats.diff}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {table.fallback_candidates.length > 0 && (
            <div>
              <h4 style={{ color: theme.colors.text.primary, marginBottom: '1rem' }}>
                {'Zus\u00E4tzliche Qualifikanten (Fallback-Regeln)'}
              </h4>
              {table.fallback_candidates.map((rule, ruleIdx) => (
                <div key={ruleIdx} style={{
                  background: `${theme.colors.accent.warning}15`,
                  border: `1px solid ${theme.colors.accent.warning}40`,
                  borderRadius: theme.borderRadius.card,
                  padding: '1rem',
                  marginBottom: '1rem'
                }}>
                  <div style={{ fontWeight: 'bold', color: theme.colors.text.primary, marginBottom: '0.75rem', fontSize: '0.875rem' }}>
                    Komplette Rangliste aller {rule.position}. Platzierten (Besten {rule.count} qualifizieren sich)
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ background: theme.colors.background.secondary }}>
                        <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: `1px solid ${theme.colors.border.standard}`, color: theme.colors.text.primary }}>Rang</th>
                        <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: `1px solid ${theme.colors.border.standard}`, color: theme.colors.text.primary }}>Status</th>
                        <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: `1px solid ${theme.colors.border.standard}`, color: theme.colors.text.primary }}>Spieler</th>
                        <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: `1px solid ${theme.colors.border.standard}`, color: theme.colors.text.primary }}>Gruppe</th>
                        <th style={{ padding: '0.5rem', textAlign: 'center', borderBottom: `1px solid ${theme.colors.border.standard}`, color: theme.colors.text.primary }}>Diff</th>
                        <th style={{ padding: '0.5rem', textAlign: 'center', borderBottom: `1px solid ${theme.colors.border.standard}`, color: theme.colors.text.primary }}>LF</th>
                        <th style={{ padding: '0.5rem', textAlign: 'center', borderBottom: `1px solid ${theme.colors.border.standard}`, color: theme.colors.text.primary }}>LA</th>
                        {usePoints && (
                          <th style={{ padding: '0.5rem', textAlign: 'center', borderBottom: `1px solid ${theme.colors.border.standard}`, fontWeight: 'bold', color: theme.colors.text.primary }}>Pkt</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {rule.candidates.map((candidate, idx) => {
                        const isQualified = candidate.qualified;
                        const isInQualificationRange = idx < rule.count;
                        return (
                          <tr key={candidate.participant_id} style={{
                            borderBottom: `1px solid ${theme.colors.border.standard}`,
                            background: isQualified ? `${theme.colors.accent.success}20` : idx % 2 === 0 ? theme.colors.background.card : theme.colors.background.secondary,
                            borderLeft: isQualified ? `4px solid ${theme.colors.accent.success}` : 'none'
                          }}>
                            <td style={{ padding: '0.5rem', color: theme.colors.text.primary, fontWeight: isQualified ? 'bold' : 'normal', textAlign: 'center' }}>{idx + 1}.</td>
                            <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                              {isQualified ? (
                                <span style={{ color: theme.colors.accent.success, fontWeight: 'bold', fontSize: '0.875rem' }}>✓ Qualifiziert</span>
                              ) : isInQualificationRange ? (
                                <span style={{ color: theme.colors.accent.warning, fontSize: '0.75rem' }}>{'W\u00FCrde qualifizieren'}</span>
                              ) : (
                                <span style={{ color: theme.colors.text.secondary, fontSize: '0.75rem' }}>Nicht qualifiziert</span>
                              )}
                            </td>
                            <td style={{ padding: '0.5rem', color: theme.colors.text.primary, fontWeight: isQualified ? 'bold' : 'normal' }}>{candidate.name}</td>
                            <td style={{ padding: '0.5rem', color: theme.colors.text.secondary }}>{candidate.group_name || `Gruppe ${candidate.group_id}`}</td>
                            <td style={{ padding: '0.5rem', textAlign: 'center', fontWeight: 'bold', color: candidate.stats.diff > 0 ? theme.colors.accent.success : candidate.stats.diff < 0 ? theme.colors.accent.error : theme.colors.text.primary }}>
                              {candidate.stats.diff > 0 ? '+' : ''}{candidate.stats.diff}
                            </td>
                            <td style={{ padding: '0.5rem', textAlign: 'center', color: theme.colors.text.primary }}>{candidate.stats.goals_for}</td>
                            <td style={{ padding: '0.5rem', textAlign: 'center', color: theme.colors.text.primary }}>{candidate.stats.goals_against}</td>
                            {usePoints && (
                              <td style={{ padding: '0.5rem', textAlign: 'center', fontWeight: 'bold', color: theme.colors.accent.info }}>{candidate.stats.points ?? 0}</td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
          {table.fallback_candidates.length === 0 && (
            <div style={{ padding: '1rem', background: theme.colors.background.secondary, borderRadius: theme.borderRadius.card, color: theme.colors.text.secondary, fontSize: '0.875rem' }}>
              {'Keine zus\u00E4tzlichen Qualifikanten erforderlich.'}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading && slides.length === 0) {
    return <div style={{ padding: '2rem', color: theme.colors.text.primary }}>Lädt...</div>;
  }

  if (!currentSlide) {
    return <div style={{ padding: '2rem', color: theme.colors.text.primary }}>Keine Daten verfügbar.</div>;
  }

  return (
    <div
      style={{
        padding: '2rem',
        minHeight: '100vh',
        background: theme.colors.background.primary,
        color: theme.colors.text.primary,
        cursor: slides.length > 1 ? 'pointer' : 'default'
      }}
      onClick={slides.length > 1 ? goNext : undefined}
      role="button"
      tabIndex={slides.length > 1 ? 0 : undefined}
      onKeyDown={e => slides.length > 1 && (e.key === 'ArrowRight' || e.key === ' ') && (e.preventDefault(), goNext())}
      aria-label={slides.length > 1 ? 'Klick für nächste Folie' : undefined}
    >
      {currentSlide.type === 'title' && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '80vh',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
            {tournament?.name || 'Turnier'}
          </div>
          <div style={{ fontSize: '1.25rem', color: theme.colors.text.secondary }}>Live Ticker</div>
          <div style={{ marginTop: '1.5rem', fontSize: '1rem', color: theme.colors.text.secondary }}>
            Automatische Aktualisierung alle {Math.round(REFRESH_MS / 1000)} Sekunden
          </div>
        </div>
      )}
      {currentSlide.type === 'group' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {currentSlide.matches.length > 0 && renderGroupMatches(currentSlide.group, currentSlide.matches)}
          {currentSlide.table && renderGroupTable(currentSlide.table)}
        </div>
      )}
      {currentSlide.type === 'ko-matches' && (
        <div>
          {renderHeader('KO-Phase', 'Turnierbaum')}
          <KOBracket
            matches={currentSlide.matches}
            participants={participants}
            tournamentId={tournamentId}
            drawMode={tournament?.ko_draw_method ?? null}
            koDistribution={tournament?.ko_distribution ?? null}
            presentationMode
          />
        </div>
      )}
      {currentSlide.type === 'qualification' && renderQualification(currentSlide.table)}

      <div style={{
        position: 'fixed',
        bottom: '1rem',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        background: theme.colors.background.card,
        padding: '0.5rem 1rem',
        borderRadius: theme.borderRadius.card,
        border: `1px solid ${theme.colors.border.standard}`,
        fontSize: '0.875rem',
        color: theme.colors.text.secondary
      }}>
        <button
          type="button"
          onClick={e => { e.stopPropagation(); goPrev(); }}
          disabled={slides.length <= 1}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: slides.length > 1 ? 'pointer' : 'not-allowed',
            padding: '0.25rem 0.5rem',
            fontSize: '1rem',
            color: theme.colors.text.secondary
          }}
          aria-label="Vorherige Folie"
        >
          {'Zur\u00FCck'}
        </button>
        <span>Folie {currentIndex + 1} / {slides.length}</span>
        <button
          type="button"
          onClick={e => { e.stopPropagation(); goNext(); }}
          disabled={slides.length <= 1}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: slides.length > 1 ? 'pointer' : 'not-allowed',
            padding: '0.25rem 0.5rem',
            fontSize: '1rem',
            color: theme.colors.text.secondary
          }}
          aria-label="Nächste Folie"
        >
          Weiter
        </button>
      </div>
    </div>
  );
}
