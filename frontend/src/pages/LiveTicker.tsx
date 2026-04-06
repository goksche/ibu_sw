// Live Ticker Page
import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { tournamentService } from '../services/tournamentService';
import { participantService } from '../services/participantService';
import { groupService, GroupWithParticipants } from '../services/groupService';
import { matchService, GroupMatch, KnockoutMatch } from '../services/matchService';
import { tableService, GroupTable, TieBreakMiniTable } from '../services/tableService';
import { qualificationService, QualificationTable } from '../services/qualificationService';
import { locationService } from '../services/locationService';
import { settingsService, DEFAULT_APP_SETTINGS } from '../services/settingsService';
import { AppSettings, Participant, Tournament } from '../types';
import { cn } from '@/lib/utils';
import {
  LiveTickerSlideGroups,
  LiveTickerSlideKO,
  LiveTickerSlideQualification,
  LiveTickerSlideTitle,
} from '../components/patterns/presentation/LiveTickerSlides';

type Slide =
  | { type: 'title' }
  | { type: 'group-batch'; groups: Array<{ group: GroupWithParticipants; matches: GroupMatch[]; table: GroupTable | null }> }
  | { type: 'ko-matches'; matches: KnockoutMatch[] }
  | { type: 'qualification'; table: QualificationTable };

export default function LiveTicker() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const tournamentId = id ? parseInt(id) : 0;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [spielfeldIdToName, setSpielfeldIdToName] = useState<Record<number, string>>({});
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [groups, setGroups] = useState<GroupWithParticipants[]>([]);
  const [groupMatches, setGroupMatches] = useState<Record<number, GroupMatch[]>>({});
  const [groupTables, setGroupTables] = useState<Record<number, GroupTable>>({});
  const [koMatches, setKoMatches] = useState<KnockoutMatch[]>([]);
  const [qualificationTable, setQualificationTable] = useState<QualificationTable | null>(null);
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await settingsService.getSettings();
        setAppSettings(data);
      } catch {
        setAppSettings(DEFAULT_APP_SETTINGS);
      }
    };
    loadSettings();
  }, [tournamentId]);

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
    const refreshMs = (appSettings.live_ticker?.refresh_interval_sec ?? DEFAULT_APP_SETTINGS.live_ticker.refresh_interval_sec) * 1000;
    const interval = setInterval(() => {
      loadData();
    }, refreshMs);
    return () => clearInterval(interval);
  }, [tournamentId, appSettings]);

  useEffect(() => {
    const newSlides: Slide[] = [{ type: 'title' }];
    const liveTicker = appSettings.live_ticker ?? DEFAULT_APP_SETTINGS.live_ticker;
    const slideOrder = liveTicker.slide_order?.length ? liveTicker.slide_order : DEFAULT_APP_SETTINGS.live_ticker.slide_order;
    const slidesEnabled = liveTicker.slides_enabled ?? DEFAULT_APP_SETTINGS.live_ticker.slides_enabled;

    const groupEntries = groups.map(group => {
      const matches = (groupMatches[group.id] || []).filter(match => {
        if (!liveTicker.only_running_group_matches) return true;
        return match.score1 === null || match.score2 === null;
      });
      const table = groupTables[group.id] || null;
      return { group, matches, table };
    }).filter(entry => entry.matches.length > 0 || entry.table);

    const groupSlides: Slide[] = [];
    if (groupEntries.length > 0) {
      const chunkSize = liveTicker.max_groups_per_slide || 1;
      for (let i = 0; i < groupEntries.length; i += chunkSize) {
        groupSlides.push({ type: 'group-batch', groups: groupEntries.slice(i, i + chunkSize) });
      }
    }

    const slideMap: Record<string, Slide[]> = {
      groups: slidesEnabled.groups ? groupSlides : [],
      qualification: slidesEnabled.qualification && qualificationTable ? [{ type: 'qualification', table: qualificationTable }] : [],
      ko: slidesEnabled.ko && koMatches.length > 0 ? [{ type: 'ko-matches', matches: koMatches }] : [],
    };

    slideOrder.forEach((key) => {
      const items = slideMap[key] || [];
      newSlides.push(...items);
    });

    setSlides(newSlides);
  }, [groups, groupMatches, groupTables, koMatches, qualificationTable, appSettings]);

  useEffect(() => {
    setCurrentIndex(0);
  }, [tournamentId]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const slideDurationMs = (appSettings.live_ticker?.slide_duration_sec ?? DEFAULT_APP_SETTINGS.live_ticker.slide_duration_sec) * 1000;
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % slides.length);
    }, slideDurationMs);
    return () => clearInterval(interval);
  }, [slides, appSettings]);

  const currentSlide = slides[currentIndex];
  const refreshSeconds = appSettings.live_ticker?.refresh_interval_sec ?? DEFAULT_APP_SETTINGS.live_ticker.refresh_interval_sec;

  const goNext = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % Math.max(1, slides.length));
  }, [slides.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex(prev => (prev - 1 + slides.length) % Math.max(1, slides.length));
  }, [slides.length]);

  const renderHeader = (title: string, subtitle?: string) => (
    <div className="mb-6">
      <div className="text-3xl font-bold text-foreground">{title}</div>
      {subtitle && (
        <div className="mt-2 text-muted-foreground text-lg">{subtitle}</div>
      )}
    </div>
  );

  const renderGroupMatches = (
    group: GroupWithParticipants,
    matches: GroupMatch[],
    options: { showSpielfeld: boolean; showResults: boolean; markDecisionMatches: boolean }
  ) => {
    const ordered = matches
      .slice()
      .sort((a, b) => (a.round - b.round) || (a.match_no - b.match_no));

    return (
      <div>
        {renderHeader(t('liveTicker.schedule', { name: group.name }), t('liveTicker.matchCount', { count: ordered.length }))}
        <div className="bg-card rounded-lg overflow-hidden border border-border">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-muted">
                <th className="p-3 text-left">{t('liveTicker.match')}</th>
                {options.showSpielfeld && (
                  <th className="p-3 text-left">{t('liveTicker.spielfeld')}</th>
                )}
                <th className="p-3 text-left">{t('liveTicker.player1')}</th>
                <th className="p-3 text-left">{t('liveTicker.player2')}</th>
                {options.showResults && (
                  <th className="p-3 text-center">{t('liveTicker.result')}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {ordered.map((match, idx) => (
                <tr key={match.id} className={cn(idx % 2 === 0 ? 'bg-card' : 'bg-muted')}>
                  <td className="p-3">
                    {t('liveTicker.match')} {match.match_no}{options.markDecisionMatches && match.is_decision_match ? ` (${t('liveTicker.decisionMatch')})` : ''}
                  </td>
                  {options.showSpielfeld && (
                    <td className="p-3">
                      {match.spielfeld_id ? (spielfeldIdToName[match.spielfeld_id] ?? `#${match.spielfeld_id}`) : '-'}
                    </td>
                  )}
                  <td className="p-3">{getParticipantNameById(match.player1_id)}</td>
                  <td className="p-3">{getParticipantNameById(match.player2_id)}</td>
                  {options.showResults && (
                    <td className="p-3 text-center font-bold">
                      {match.score1 !== null && match.score2 !== null ? `${match.score1} : ${match.score2}` : '- : -'}
                    </td>
                  )}
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
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <h3 className="p-4 bg-primary text-primary-foreground m-0">
            {table.group_name}
          </h3>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-muted">
                <th className="p-3 text-center border-b-2 border-border text-foreground">{t('common.rank')}</th>
                <th className="p-3 text-left border-b-2 border-border text-foreground">{t('common.table.player')}</th>
                <th className="p-3 text-center border-b-2 border-border text-foreground">{t('common.table.games')}</th>
                <th className="p-3 text-center border-b-2 border-border text-foreground">{t('common.table.wins')}</th>
                <th className="p-3 text-center border-b-2 border-border text-foreground">{t('common.table.draws')}</th>
                <th className="p-3 text-center border-b-2 border-border text-foreground">{t('common.table.losses')}</th>
                <th className="p-3 text-center border-b-2 border-border text-foreground">{t('common.table.goalsFor')}</th>
                <th className="p-3 text-center border-b-2 border-border text-foreground">{t('common.table.goalsAgainst')}</th>
                <th className="p-3 text-center border-b-2 border-border font-bold text-foreground">{t('common.table.diff')}</th>
                {usePoints && (
                  <th className="p-3 text-center border-b-2 border-border font-bold text-foreground">{t('common.table.pts')}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {table.table.map((row, idx) => (
                <tr key={row.participant_id} className={cn('border-b border-border', idx % 2 === 0 ? 'bg-card' : 'bg-muted')}>
                  <td className={cn('p-3 text-center', idx < 2 ? 'font-bold text-info' : 'text-foreground')}>{row.rank}</td>
                  <td className="p-3 text-left text-foreground">
                    {row.name}
                    {row.won_decision_match === true && (
                      <span className="text-success font-bold ml-1" title={t('liveTicker.decisionMatchWinner')}>*</span>
                    )}
                    {row.is_in_tie_group && row.tie_group_size && (
                      <span className="text-xs text-muted-foreground ml-1" title={t('liveTicker.tieGroupSize', { count: row.tie_group_size })}>
                        ({row.tie_group_size})
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-center text-foreground">{row.games}</td>
                  <td className="p-3 text-center text-foreground">{row.wins}</td>
                  <td className="p-3 text-center text-foreground">{(row as any).draws ?? 0}</td>
                  <td className="p-3 text-center text-foreground">{row.losses}</td>
                  <td className="p-3 text-center text-foreground">{row.goals_for}</td>
                  <td className="p-3 text-center text-foreground">{row.goals_against}</td>
                  <td className={cn('p-3 text-center font-bold', row.diff > 0 ? 'text-success' : row.diff < 0 ? 'text-destructive' : 'text-foreground')}>
                    {row.diff > 0 ? '+' : ''}{row.diff}
                  </td>
                  {usePoints && (
                    <td className="p-3 text-center font-bold text-info">{row.points ?? 0}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {table.tie_break_mini_tables && table.tie_break_mini_tables.length > 0 && (
          <div className="mt-4">
            {table.tie_break_mini_tables.map((tieTable: TieBreakMiniTable, tableIndex: number) => (
              <div key={tableIndex} className="mt-4 bg-card border border-border rounded-lg overflow-hidden">
                <div className="px-4 py-3 bg-muted border-b border-border text-sm font-bold text-foreground">
                  {t('liveTicker.tieBreakMini', { count: tieTable.participant_ids.length })}
                  {tieTable.is_completely_tied && (
                    <span className="text-xs text-destructive font-normal ml-2"> - {t('liveTicker.completelyTied')}</span>
                  )}
                </div>
                <div className="p-4">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-muted">
                        <th className="p-2 text-left border-b border-border text-foreground">{t('common.table.player')}</th>
                        <th className="p-2 text-center border-b border-border text-foreground">{t('common.table.games')}</th>
                        <th className="p-2 text-center border-b border-border text-foreground">{t('common.table.wins')}</th>
                        <th className="p-2 text-center border-b border-border text-foreground">{t('common.table.draws')}</th>
                        <th className="p-2 text-center border-b border-border text-foreground">{t('common.table.losses')}</th>
                        <th className="p-2 text-center border-b border-border text-foreground">{t('common.table.goalsFor')}</th>
                        <th className="p-2 text-center border-b border-border text-foreground">{t('common.table.goalsAgainst')}</th>
                        <th className="p-2 text-center border-b border-border font-bold text-foreground">{t('common.table.diff')}</th>
                        {usePoints && (
                          <th className="p-2 text-center border-b border-border font-bold text-foreground">{t('common.table.pts')}</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {tieTable.mini_table.map((miniRow, miniIdx) => (
                        <tr key={miniRow.participant_id} className={cn('border-b border-border', miniIdx % 2 === 0 ? 'bg-card' : 'bg-muted')}>
                          <td className="p-2 text-left text-foreground font-medium">{miniRow.name}</td>
                          <td className="p-2 text-center text-foreground">{miniRow.games}</td>
                          <td className="p-2 text-center text-foreground">{miniRow.wins}</td>
                          <td className="p-2 text-center text-foreground">{miniRow.draws}</td>
                          <td className="p-2 text-center text-foreground">{miniRow.losses}</td>
                          <td className="p-2 text-center text-foreground">{miniRow.goals_for}</td>
                          <td className="p-2 text-center text-foreground">{miniRow.goals_against}</td>
                          <td className={cn('p-2 text-center font-bold', miniRow.diff > 0 ? 'text-success' : miniRow.diff < 0 ? 'text-destructive' : 'text-foreground')}>
                            {miniRow.diff > 0 ? '+' : ''}{miniRow.diff}
                          </td>
                          {usePoints && (
                            <td className="p-2 text-center font-bold text-info">{miniRow.points ?? 0}</td>
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

  const renderGroupBatch = (entries: Array<{ group: GroupWithParticipants; matches: GroupMatch[]; table: GroupTable | null }>) => {
    const liveTicker = appSettings.live_ticker ?? DEFAULT_APP_SETTINGS.live_ticker;
    const options = {
      showSpielfeld: liveTicker.show_spielfeld,
      showResults: liveTicker.show_results,
      markDecisionMatches: liveTicker.mark_decision_matches,
    };
    return (
      <div className={cn(
        'grid gap-8',
        entries.length > 1 ? 'grid-cols-2' : 'grid-cols-1'
      )}>
        {entries.map((entry) => (
          <div key={entry.group.id} className="flex flex-col gap-6">
            {entry.matches.length > 0 && renderGroupMatches(entry.group, entry.matches, options)}
            {entry.table && renderGroupTable(entry.table)}
          </div>
        ))}
      </div>
    );
  };

  const renderQualification = (table: QualificationTable) => {
    const usePoints = tournament?.league_scoring_system === 'points';
    return (
      <div>
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="mt-0 mb-4 text-foreground border-b-2 border-warning pb-2">
            {t('liveTicker.qualificationOverview')}
          </h3>
          <div className="mb-6 text-muted-foreground text-sm">
            <div><strong>{t('liveTicker.qualificationPlan')}</strong></div>
            <div>{t('liveTicker.basisPerGroup', { count: table.basis_per_group })}</div>
            <div>{t('liveTicker.qualifiedTotal', { count: table.qualified_count })}</div>
            {table.qualification_plan.remainder > 0 && (
              <div className="text-warning mt-2">
                {t('liveTicker.additionalQualify', { count: table.qualification_plan.remainder, position: table.basis_per_group + 1 })}
              </div>
            )}
          </div>
          <div className="mb-8">
            <h4 className="text-foreground mb-4">{t('liveTicker.qualifiedParticipantsBasis')}</h4>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-4">
              {table.group_qualifiers.map((groupQual) => (
                <div key={groupQual.group_id} className="bg-muted border border-border rounded-lg p-4">
                  <h5 className="mt-0 mb-3 text-primary text-base">
                    {groupQual.group_name}
                  </h5>
                  <div className="flex flex-col gap-2">
                    {groupQual.basis_qualifiers.map((qualifier) => (
                      <div
                        key={qualifier.participant_id}
                        className={cn(
                          'p-2 bg-card rounded-md border flex justify-between items-center',
                          qualifier.qualified ? 'border-success' : 'border-border'
                        )}
                      >
                        <div>
                          <span className="font-bold text-foreground mr-2">{qualifier.position}.</span>
                          <span className="text-foreground">{qualifier.name}</span>
                          {qualifier.qualified && (
                            <span className="text-success font-bold ml-2">
                              {t('liveTicker.qualified')}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {t('common.table.diff')}: {qualifier.stats.diff > 0 ? '+' : ''}{qualifier.stats.diff}
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
              <h4 className="text-foreground mb-4">
                {t('liveTicker.additionalQualifiers')}
              </h4>
              {table.fallback_candidates.map((rule, ruleIdx) => (
                <div key={ruleIdx} className="bg-warning/10 border border-warning/40 rounded-lg p-4 mb-4">
                  <div className="font-bold text-foreground mb-3 text-sm">
                    {t('liveTicker.fullRankingOfPosition', { position: rule.position, count: rule.count })}
                  </div>
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-muted">
                        <th className="p-2 text-left border-b border-border text-foreground">{t('common.rank')}</th>
                        <th className="p-2 text-left border-b border-border text-foreground">{t('common.status')}</th>
                        <th className="p-2 text-left border-b border-border text-foreground">{t('common.table.player')}</th>
                        <th className="p-2 text-left border-b border-border text-foreground">{t('tournament.tables.group')}</th>
                        <th className="p-2 text-center border-b border-border text-foreground">{t('common.table.diff')}</th>
                        <th className="p-2 text-center border-b border-border text-foreground">{t('common.table.goalsFor')}</th>
                        <th className="p-2 text-center border-b border-border text-foreground">{t('common.table.goalsAgainst')}</th>
                        {usePoints && (
                          <th className="p-2 text-center border-b border-border font-bold text-foreground">{t('common.table.pts')}</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {rule.candidates.map((candidate, idx) => {
                        const isQualified = candidate.qualified;
                        const isInQualificationRange = idx < rule.count;
                        return (
                          <tr
                            key={candidate.participant_id}
                            className={cn(
                              'border-b border-border',
                              isQualified ? 'bg-success/20 border-l-4 border-l-success' : idx % 2 === 0 ? 'bg-card' : 'bg-muted'
                            )}
                          >
                            <td className={cn('p-2 text-foreground text-center', isQualified && 'font-bold')}>{idx + 1}.</td>
                            <td className="p-2 text-center">
                              {isQualified ? (
                                <span className="text-success font-bold text-sm">
                                  {t('liveTicker.qualified')}
                                </span>
                              ) : isInQualificationRange ? (
                                <span className="text-warning text-xs">{t('liveTicker.wouldQualify')}</span>
                              ) : (
                                <span className="text-muted-foreground text-xs">{t('liveTicker.notQualified')}</span>
                              )}
                            </td>
                            <td className={cn('p-2 text-foreground', isQualified && 'font-bold')}>{candidate.name}</td>
                            <td className="p-2 text-muted-foreground">{candidate.group_name || `${t('tournament.tables.group')} ${candidate.group_id}`}</td>
                            <td className={cn('p-2 text-center font-bold', candidate.stats.diff > 0 ? 'text-success' : candidate.stats.diff < 0 ? 'text-destructive' : 'text-foreground')}>
                              {candidate.stats.diff > 0 ? '+' : ''}{candidate.stats.diff}
                            </td>
                            <td className="p-2 text-center text-foreground">{candidate.stats.goals_for}</td>
                            <td className="p-2 text-center text-foreground">{candidate.stats.goals_against}</td>
                            {usePoints && (
                              <td className="p-2 text-center font-bold text-info">{candidate.stats.points ?? 0}</td>
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
            <div className="p-4 bg-muted rounded-lg text-muted-foreground text-sm">
              {t('liveTicker.noAdditionalRequired')}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading && slides.length === 0) {
    return <div className="p-8 text-foreground">{t('liveTicker.loading')}</div>;
  }

  if (!currentSlide) {
    return <div className="p-8 text-foreground">{t('liveTicker.noData')}</div>;
  }

  return (
    <div
      className={cn(
        'p-8 min-h-screen bg-background text-foreground page-shell',
        slides.length > 1 ? 'cursor-pointer' : 'cursor-default'
      )}
      onClick={slides.length > 1 ? goNext : undefined}
      role="button"
      tabIndex={slides.length > 1 ? 0 : undefined}
      onKeyDown={e => slides.length > 1 && (e.key === 'ArrowRight' || e.key === ' ') && (e.preventDefault(), goNext())}
      aria-label={slides.length > 1 ? 'Klick für nächste Folie' : undefined}
    >
      {currentSlide.type === 'title' && (
        <LiveTickerSlideTitle
          tournamentName={tournament?.name || t('liveTicker.tournament')}
          subtitle={t('liveTicker.title')}
          refreshHint={t('liveTicker.autoRefresh', { seconds: refreshSeconds })}
        />
      )}
      {currentSlide.type === 'group-batch' && (
        <LiveTickerSlideGroups
          title={t('liveTicker.schedule', { name: tournament?.name || t('liveTicker.tournament') })}
          subtitle={t('liveTicker.matchCount', {
            count: currentSlide.groups.reduce((acc, groupEntry) => acc + groupEntry.matches.length, 0),
          })}
        >
          {renderGroupBatch(currentSlide.groups)}
        </LiveTickerSlideGroups>
      )}
      {currentSlide.type === 'ko-matches' && (
        <LiveTickerSlideKO
          title={t('liveTicker.koPhase')}
          subtitle={t('liveTicker.koBracket')}
          matches={currentSlide.matches}
          participants={participants}
          tournamentId={tournamentId}
          drawMode={tournament?.ko_draw_method ?? null}
          koDistribution={tournament?.ko_distribution ?? null}
        />
      )}
      {currentSlide.type === 'qualification' && (
        <LiveTickerSlideQualification
          title={t('liveTicker.qualificationOverview')}
          subtitle={t('liveTicker.qualifiedTotal', { count: currentSlide.table.qualified_count })}
        >
          {renderQualification(currentSlide.table)}
        </LiveTickerSlideQualification>
      )}

      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-card p-2 px-4 rounded-lg border border-border text-sm text-muted-foreground arena-surface">
        <button
          type="button"
          onClick={e => { e.stopPropagation(); goPrev(); }}
          disabled={slides.length <= 1}
          className={cn(
            'bg-transparent border-none py-1 px-2 text-base text-muted-foreground',
            slides.length > 1 ? 'cursor-pointer hover:text-foreground' : 'cursor-not-allowed opacity-50'
          )}
          aria-label="Vorherige Folie"
        >
          {t('liveTicker.prev')}
        </button>
        <span>{t('liveTicker.slideCounter', { current: currentIndex + 1, total: slides.length })}</span>
        <button
          type="button"
          onClick={e => { e.stopPropagation(); goNext(); }}
          disabled={slides.length <= 1}
          className={cn(
            'bg-transparent border-none py-1 px-2 text-base text-muted-foreground',
            slides.length > 1 ? 'cursor-pointer hover:text-foreground' : 'cursor-not-allowed opacity-50'
          )}
          aria-label="Nächste Folie"
        >
          {t('liveTicker.next')}
        </button>
      </div>
    </div>
  );
}
