// Tournament Matches Content (for Tab)
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { groupService, GroupWithParticipants } from '../../services/groupService';
import { matchService, GroupMatch, KnockoutMatch } from '../../services/matchService';
import { participantService } from '../../services/participantService';
import { tableService } from '../../services/tableService';
import { tournamentService } from '../../services/tournamentService';
import { locationService } from '../../services/locationService';
import { Tournament, Participant } from '../../types';
import { cn } from '@/lib/utils';
import { Button } from '../ui';
import KOBracket from './KOBracket';

interface TournamentMatchesContentProps {
  tournamentId: number;
  tournament: Tournament;
  view?: 'group' | 'ko' | 'both';
}

export default function TournamentMatchesContent({ tournamentId, tournament, view = 'both' }: TournamentMatchesContentProps) {
  const { t } = useTranslation();
  const { canEdit, isAdmin } = useAuth();
  const [groups, setGroups] = useState<GroupWithParticipants[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [groupMatches, setGroupMatches] = useState<GroupMatch[]>([]);
  const [koMatches, setKoMatches] = useState<KnockoutMatch[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMatch, setEditingMatch] = useState<number | null>(null);
  const [scoreForm, setScoreForm] = useState({ score1: '', score2: '' });
  const [matchType, setMatchType] = useState<'group' | 'ko'>(() => {
    if (view === 'group') return 'group';
    if (view === 'ko') return 'ko';
    return tournament.has_group_phase ? 'group' : 'ko';
  });
  const [koViewMode, setKoViewMode] = useState<'table' | 'bracket'>('bracket');
  const [playerSearch, setPlayerSearch] = useState('');
  const [decisionMatchesLoading, setDecisionMatchesLoading] = useState(false);
  const [simMinScore, setSimMinScore] = useState(0);
  const [simMaxScore, setSimMaxScore] = useState(5);
  const [simAllowDraws, setSimAllowDraws] = useState(true);
  const [simOverwrite, setSimOverwrite] = useState(false);
  const [simLoadingPhase, setSimLoadingPhase] = useState<'group' | 'ko' | null>(null);
  const [manualPairs, setManualPairs] = useState<Array<{ player1_id: number | null; player2_id: number | null }>>([]);
  const [manualError, setManualError] = useState<string | null>(null);
  const [manualSaving, setManualSaving] = useState(false);
  const [qualifiedParticipants, setQualifiedParticipants] = useState<{ id: number; first_name: string; last_name: string }[]>([]);
  const [qualifiedLoading, setQualifiedLoading] = useState(false);
  const [spielfeldIdToName, setSpielfeldIdToName] = useState<Record<number, string>>({});

  useEffect(() => {
    loadData();
  }, [tournamentId]);

  useEffect(() => {
    if (!tournament.location_id) {
      setSpielfeldIdToName({});
      return;
    }
    const loadLocations = async () => {
      try {
        const locations = await locationService.getAll();
        const loc = locations.find(l => l.id === tournament.location_id);
        if (loc?.spielfelder) {
          const map: Record<number, string> = {};
          loc.spielfelder.forEach(s => { map[s.id] = s.name; });
          setSpielfeldIdToName(map);
        } else {
          setSpielfeldIdToName({});
        }
      } catch {
        setSpielfeldIdToName({});
      }
    };
    loadLocations();
  }, [tournament.location_id]);

  const loadData = async () => {
    try {
      // Load tournament participants (needed for KO view)
      if (view !== 'group') {
        try {
          const participantsData = await participantService.getTournamentParticipants(tournamentId);
          setParticipants(participantsData);
        } catch (err) {
          const participantsData = await participantService.getAll();
          setParticipants(participantsData);
        }
      }

      if (view !== 'ko' && tournament.has_group_phase) {
        const groupsData = await groupService.getGroups(tournamentId);
        
        const fullGroups = await Promise.all(
          groupsData.map(async (g) => await groupService.getGroup(g.id))
        );
        setGroups(fullGroups);
        
        if (fullGroups.length > 0 && !selectedGroupId) {
          setSelectedGroupId(fullGroups[0].id);
        }
      }
      
      if (view !== 'group' && tournament.has_ko_phase) {
        const koData = await matchService.getKnockoutMatches(tournamentId);
        setKoMatches(koData);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Refresh KO matches only (for use after draw)
  const refreshKoMatches = async () => {
    if (tournament.has_ko_phase) {
      try {
        const koData = await matchService.getKnockoutMatches(tournamentId);
        setKoMatches(koData);
      } catch (err) {
        console.error('Failed to refresh KO matches:', err);
      }
    }
  };

  const spielfelderList = tournament.location_id
    ? Object.entries(spielfeldIdToName).map(([id, name]) => ({ id: Number(id), name }))
    : [];

  const getSpielfeldLabel = (spielfeldId: number | null | undefined, matchNo: number) => {
    if (spielfeldId) {
      return spielfeldIdToName[spielfeldId] ?? `#${spielfeldId}`;
    }
    const temporaryCount = tournament.temporary_spielfelder_count ?? 0;
    if (temporaryCount > 0) {
      const slot = ((Math.max(1, matchNo) - 1) % temporaryCount) + 1;
      return `Spielfeld ${slot}`;
    }
    return '–';
  };

  const handleKoMatchSpielfeldChange = async (matchId: number, spielfeldId: number | null) => {
    try {
      await matchService.updateKnockoutMatch(matchId, { spielfeld_id: spielfeldId });
      setKoMatches((prev) =>
        prev.map((m) => (m.id === matchId ? { ...m, spielfeld_id: spielfeldId } : m))
      );
    } catch (err) {
      console.error('Failed to update KO match spielfeld:', err);
      alert(t('tournament.matchesContent.spielfeldSaveError'));
    }
  };

  const getBracketSize = (count: number) => {
    if (count <= 4) return 4;
    if (count <= 8) return 8;
    if (count <= 16) return 16;
    if (count <= 32) return 32;
    return 2 ** Math.ceil(Math.log2(count));
  };

  useEffect(() => {
    if (view === 'group') {
      setMatchType('group');
      return;
    }
    if (view === 'ko') {
      setMatchType('ko');
      return;
    }
    if (!tournament.has_group_phase && tournament.has_ko_phase) {
      setMatchType('ko');
    }
  }, [view, tournament.has_group_phase, tournament.has_ko_phase]);

  useEffect(() => {
    if (playerSearch.trim() && matchType === 'ko' && koViewMode === 'bracket') {
      setKoViewMode('table');
    }
  }, [playerSearch, matchType, koViewMode]);

  const isManualKo = (tournament.mode === 'knockout' || tournament.mode === 'combined') && tournament.ko_draw_method === 'manual';
  const r1ParticipantSource = tournament.mode === 'combined' && isManualKo ? qualifiedParticipants : participants;
  const r1ParticipantIds = r1ParticipantSource.map(p => p.id);

  useEffect(() => {
    if (view === 'group') return;
    if (!isManualKo || koMatches.length > 0) return;
    const count = r1ParticipantIds.length;
    if (count < 2) return;
    const bracketSize = getBracketSize(count);
    const requiredPairs = bracketSize / 2;
    setManualPairs(prev => {
      if (prev.length === requiredPairs) return prev;
      return Array.from({ length: requiredPairs }, () => ({ player1_id: null, player2_id: null }));
    });
  }, [r1ParticipantIds.length, isManualKo, koMatches.length]);

  useEffect(() => {
    if (view === 'group') return;
    if (!tournament.has_ko_phase || tournament.mode !== 'combined' || tournament.ko_draw_method !== 'manual') {
      setQualifiedParticipants([]);
      return;
    }
    let cancelled = false;
    setQualifiedLoading(true);
    tournamentService.getQualifiedParticipants(tournamentId)
      .then(data => {
        if (!cancelled) setQualifiedParticipants(data.participants || []);
      })
      .catch(() => { if (!cancelled) setQualifiedParticipants([]); })
      .finally(() => { if (!cancelled) setQualifiedLoading(false); });
    return () => { cancelled = true; };
  }, [tournamentId, tournament.has_ko_phase, tournament.mode, tournament.ko_draw_method]);

  useEffect(() => {
    if (selectedGroupId && matchType === 'group') {
      loadGroupMatches();
    }
  }, [selectedGroupId, matchType]);

  const loadGroupMatches = async () => {
    if (!selectedGroupId) return;
    
    try {
      const matchesData = await matchService.getGroupMatches(tournamentId, selectedGroupId);
      setGroupMatches(matchesData);
    } catch (err) {
      console.error('Failed to load matches:', err);
    }
  };

  const canEnterKoResult = (match: KnockoutMatch): boolean => {
    if (match.player1_id == null && match.player2_id == null) return false;
    if (match.round === 1) return true;
    if (match.round === 99 || match.round >= 2000) return true;
    if (match.round < 1) return false;
    const pred1 = koMatches.find((m) => m.round === match.round - 1 && m.match_no === 2 * match.match_no - 1);
    const pred2 = koMatches.find((m) => m.round === match.round - 1 && m.match_no === 2 * match.match_no);
    if (!pred1 || !pred2) return false;
    const complete = (p: KnockoutMatch) => {
      if (p.player1_id == null && p.player2_id == null) return false;
      if (p.player1_id == null || p.player2_id == null) return true;
      return p.score1 != null && p.score2 != null && p.score1 !== p.score2;
    };
    return complete(pred1) && complete(pred2);
  };

    const handleEdit = (match: GroupMatch | KnockoutMatch) => {
    const isKoMatch = 'round' in match && !('group_id' in match);
    const hasNoResult = match.score1 == null || match.score2 == null;
    if (isKoMatch && hasNoResult && !canEnterKoResult(match)) {
      alert('Ergebnis kann erst eingetragen werden, wenn die Runde ausgelost ist und die Vorrunde abgeschlossen ist.');
      return;
    }
    setEditingMatch(match.id);
    setScoreForm({
      score1: match.score1?.toString() || '',
      score2: match.score2?.toString() || '',
    });
  };

  const handleMatchEditClick = (matchId: number) => {
    const match = koMatches.find(m => m.id === matchId);
    if (match) {
      handleEdit(match);
    }
  };

  const handleSave = async (matchId: number) => {
    try {
      if (matchType === 'group') {
        await matchService.updateGroupMatch(matchId, {
          score1: scoreForm.score1 ? parseInt(scoreForm.score1) : undefined,
          score2: scoreForm.score2 ? parseInt(scoreForm.score2) : undefined,
        });
        // Reload matches to check for decision matches
        await loadGroupMatches();
        // Check if new decision matches were generated (they would appear in the list)
        // The backend automatically generates them after match update
      } else {
        await matchService.updateKnockoutMatch(matchId, {
          score1: scoreForm.score1 ? parseInt(scoreForm.score1) : undefined,
          score2: scoreForm.score2 ? parseInt(scoreForm.score2) : undefined,
        });
        const koData = await matchService.getKnockoutMatches(tournamentId);
        setKoMatches(koData);
      }
      setEditingMatch(null);
      setScoreForm({ score1: '', score2: '' });
    } catch (err) {
      console.error('Failed to save match:', err);
      alert(t('tournament.matchesContent.resultSaveError'));
    }
  };

  const handleCancel = () => {
    setEditingMatch(null);
    setScoreForm({ score1: '', score2: '' });
  };

  const handleGenerateDecisionMatches = async () => {
    if (!selectedGroupId) return;
    setDecisionMatchesLoading(true);
    try {
      await tableService.generateDecisionMatches(selectedGroupId);
      await loadGroupMatches();
      alert('Entscheidungsspiele wurden generiert.');
    } catch (err: any) {
      alert(`Fehler beim Generieren: ${err.response?.data?.detail || err.message}`);
    } finally {
      setDecisionMatchesLoading(false);
    }
  };

  const handleDeleteDecisionMatches = async () => {
    if (!selectedGroupId) return;
    if (!confirm(t('tournament.matchesContent.deleteDecisionConfirm'))) {
      return;
    }
    setDecisionMatchesLoading(true);
    try {
      await tableService.deleteDecisionMatches(selectedGroupId);
      await loadGroupMatches();
    } catch (err: any) {
      alert(`Fehler beim Löschen: ${err.response?.data?.detail || err.message}`);
    } finally {
      setDecisionMatchesLoading(false);
    }
  };

  const handleGenerateKOBracket = async () => {
    if (!confirm(t('tournament.matchesContent.generateKoBracket'))) {
      return;
    }
    try {
      const result = await tournamentService.generateKOBracket(tournamentId);
      alert(`KO-Bracket erfolgreich generiert!\nSpiele: ${result.matches_created}\nErste Runde: Top ${result.first_round_size}\nModus: ${result.mode}`);
      const koData = await matchService.getKnockoutMatches(tournamentId);
      setKoMatches(koData);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Fehler beim Generieren des KO-Brackets');
    }
  };

  const handleSimulatePhase = async (phase: 'group' | 'ko') => {
    if (!isAdmin) return;
    if (simMinScore < 0 || simMaxScore < 0 || simMinScore > simMaxScore) {
      alert('Ungültiger Ergebnisbereich. Bitte Min/Max prüfen.');
      return;
    }
    setSimLoadingPhase(phase);
    try {
      const result = await tournamentService.simulatePhase(tournamentId, {
        phase,
        min_score: simMinScore,
        max_score: simMaxScore,
        allow_draws: simAllowDraws,
        overwrite_existing: simOverwrite,
        group_id: phase === 'group' ? (selectedGroupId ?? undefined) : undefined,
      });
      if (phase === 'group') {
        await loadGroupMatches();
      } else {
        await refreshKoMatches();
      }
      alert(
        `Simulation (${phase === 'group' ? 'Gruppenspiele' : 'KO-Phase'}) abgeschlossen.\n` +
          `Aktualisiert: ${result.updated_matches}\nÜbersprungen: ${result.skipped_matches}`
      );
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Simulation fehlgeschlagen');
    } finally {
      setSimLoadingPhase(null);
    }
  };

  const getParticipantName = (participantId: number | null): string => {
    if (!participantId || !groups.length || !selectedGroupId) return '-';
    const group = groups.find(g => g.id === selectedGroupId);
    if (!group) return '-';
    const participant = group.participants.find(p => p.id === participantId);
    return participant ? `${participant.first_name} ${participant.last_name}` : '-';
  };

  const getParticipantNameById = (participantId: number | null): string => {
    if (!participantId) return '-';
    const participant = participants.find(p => p.id === participantId);
    return participant ? `${participant.first_name} ${participant.last_name}` : `ID ${participantId}`;
  };

  const getKoParticipantLabel = (match: KnockoutMatch, slot: 1 | 2) => {
    const participantId = slot === 1 ? match.player1_id : match.player2_id;
    if (participantId) {
      return getParticipantNameById(participantId);
    }
    if (tournament.ko_distribution === 'predefined_slots' && match.round > 1 && match.round !== 99) {
      const sourceMatchNo = (match.match_no - 1) * 2 + slot;
      return `Sieger Spiel ${sourceMatchNo}`;
    }
    return '-';
  };

  const getWinnersOfRound = (roundNum: number): number[] => {
    const matches = koMatches.filter(m => m.round === roundNum).sort((a, b) => a.match_no - b.match_no);
    const winners: number[] = [];
    for (const m of matches) {
      if (m.player1_id == null && m.player2_id != null) winners.push(m.player2_id);
      else if (m.player2_id == null && m.player1_id != null) winners.push(m.player1_id);
      else if (m.player1_id != null && m.player2_id != null && m.score1 != null && m.score2 != null && m.score1 !== m.score2) {
        winners.push(m.score1 > m.score2 ? m.player1_id : m.player2_id);
      }
    }
    return winners;
  };

  const getLosersOfRound = (roundNum: number): number[] => {
    const matches = koMatches.filter(m => m.round === roundNum).sort((a, b) => a.match_no - b.match_no);
    const losers: number[] = [];
    for (const m of matches) {
      if (m.player1_id != null && m.player2_id != null && m.score1 != null && m.score2 != null && m.score1 !== m.score2) {
        losers.push(m.score1 < m.score2 ? m.player1_id : m.player2_id);
      }
    }
    return losers;
  };

  /** Teilnehmer, die in einer Runde spielen (player1/player2 aller Matches). Fallback wenn noch keine Sieger/Verlierer. */
  const getParticipantsInRound = (roundNum: number): number[] => {
    const matches = koMatches.filter(m => m.round === roundNum).sort((a, b) => a.match_no - b.match_no);
    const seen = new Set<number>();
    const ids: number[] = [];
    for (const m of matches) {
      if (m.player1_id != null && !seen.has(m.player1_id)) {
        seen.add(m.player1_id);
        ids.push(m.player1_id);
      }
      if (m.player2_id != null && !seen.has(m.player2_id)) {
        seen.add(m.player2_id);
        ids.push(m.player2_id);
      }
    }
    return ids;
  };

  const [roundPairingsEdits, setRoundPairingsEdits] = useState<Record<number, Array<{ match_no: number; player1_id: number | null; player2_id: number | null }>>>({});
  const [savingRound, setSavingRound] = useState<number | null>(null);

  useEffect(() => {
    if (!isManualKo || koMatches.length === 0) return;
    const rounds = Array.from(new Set(koMatches.map(m => m.round))).filter(r => r >= 1 || r === 99).sort((a, b) => (a === 99 ? 1 : a) - (b === 99 ? 1 : b));
    setRoundPairingsEdits(prev => {
      const next = { ...prev };
      for (const r of rounds) {
        const matches = koMatches.filter(m => m.round === r).sort((a, b) => a.match_no - b.match_no);
        next[r] = matches.map(m => ({ match_no: m.match_no, player1_id: m.player1_id ?? null, player2_id: m.player2_id ?? null }));
      }
      return next;
    });
  }, [isManualKo, koMatches]);

  const updateRoundPairing = (round: number, matchNo: number, slot: 'player1_id' | 'player2_id', value: number | null) => {
    setRoundPairingsEdits(prev => {
      const list = prev[round] ?? [];
      const next = list.map(p => p.match_no === matchNo ? { ...p, [slot]: value } : p);
      return { ...prev, [round]: next };
    });
  };

  const handleSaveRoundPairings = async (round: number) => {
    const pairs = roundPairingsEdits[round];
    if (!pairs?.length) return;
    setSavingRound(round);
    try {
      await tournamentService.setKoRoundPairings(tournamentId, round, pairs);
      await refreshKoMatches();
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err && err.response && typeof (err.response as { data?: { detail?: string } }).data?.detail === 'string'
        ? (err.response as { data: { detail: string } }).data.detail
        : t('tournament.matchesContent.pairingSaveError');
      alert(msg);
    } finally {
      setSavingRound(null);
    }
  };

  const updateManualPair = (index: number, slot: 'player1_id' | 'player2_id', value: string) => {
    const parsed = value ? parseInt(value) : null;
    setManualPairs(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [slot]: parsed };
      return next;
    });
  };

  const handleSaveManualPairs = async () => {
    setManualError(null);
    const selectedIds = manualPairs.flatMap(pair => (
      [pair.player1_id, pair.player2_id].filter((id): id is number => id !== null)
    ));
    const uniqueIds = new Set(selectedIds);
    if (uniqueIds.size !== selectedIds.length) {
      setManualError(t('tournament.matchesContent.duplicateParticipant'));
      return;
    }

    const expectedIds = new Set(r1ParticipantIds);
    for (const id of uniqueIds) {
      if (!expectedIds.has(id)) {
        setManualError(t('tournament.matchesContent.invalidParticipant'));
        return;
      }
    }

    if (uniqueIds.size !== expectedIds.size) {
      setManualError(t('tournament.matchesContent.assignAll'));
      return;
    }

    setManualSaving(true);
    try {
      const pairsWithMatchNo = manualPairs.map((p, i) => ({ match_no: i + 1, player1_id: p.player1_id, player2_id: p.player2_id }));
      await tournamentService.setKoRoundPairings(tournamentId, 1, pairsWithMatchNo);
      const koData = await matchService.getKnockoutMatches(tournamentId);
      setKoMatches(koData);
      setManualError(null);
    } catch (err: any) {
      setManualError(err.response?.data?.detail || t('tournament.matchesContent.pairingSaveError'));
    } finally {
      setManualSaving(false);
    }
  };

  if (loading) return <div className="text-muted-foreground">{t('common.loading')}</div>;

  const selectedGroup = groups.find(g => g.id === selectedGroupId);
  const regularGroupMatches = groupMatches.filter(m => !m.is_decision_match);
  const decisionGroupMatches = groupMatches.filter(m => m.is_decision_match);
  const normalizedPlayerSearch = playerSearch.trim().toLowerCase();
  const matchesPlayerFilter = (player1Id: number | null, player2Id: number | null, useGroupLookup = false) => {
    if (!normalizedPlayerSearch) return true;
    const player1Name = useGroupLookup ? getParticipantName(player1Id) : getParticipantNameById(player1Id);
    const player2Name = useGroupLookup ? getParticipantName(player2Id) : getParticipantNameById(player2Id);
    return (
      player1Name.toLowerCase().includes(normalizedPlayerSearch) ||
      player2Name.toLowerCase().includes(normalizedPlayerSearch)
    );
  };
  const filteredRegularGroupMatches = regularGroupMatches.filter((m) =>
    matchesPlayerFilter(m.player1_id, m.player2_id, true)
  );
  const filteredDecisionGroupMatches = decisionGroupMatches.filter((m) =>
    matchesPlayerFilter(m.player1_id, m.player2_id, true)
  );
  const filteredKoMatches = koMatches.filter((m) =>
    matchesPlayerFilter(m.player1_id, m.player2_id, false)
  );
  const canGenerateKo = canEdit && tournament.mode === 'knockout' && tournament.has_ko_phase && !tournament.has_group_phase && !isManualKo;

  const scoreInputClasses = 'w-[60px] py-1 text-center border border-border rounded-md bg-background text-foreground';

  return (
    <div>
      {/* Phase Selection */}
      {view === 'both' && tournament.has_group_phase && tournament.has_ko_phase && (
        <div className="mb-8">
          <label className="block mb-2 font-bold text-foreground">
            Phase auswählen:
          </label>
          <div className="flex gap-2">
            <Button
              onClick={() => setMatchType('group')}
              variant={matchType === 'group' ? 'info' : 'secondary'}
              className={cn(matchType === 'group' && 'font-bold')}
            >
              {t('tournament.matchesContent.groupPhase')}
            </Button>
            <Button
              onClick={() => setMatchType('ko')}
              variant={matchType === 'ko' ? 'danger' : 'secondary'}
              className={cn(matchType === 'ko' && 'font-bold')}
            >
              {t('common.mode.koPhase')}
            </Button>
          </div>
        </div>
      )}

      <div className="mb-6">
        <label className="block mb-2 font-bold text-foreground">Spieler suchen</label>
        <input
          type="text"
          value={playerSearch}
          onChange={(e) => setPlayerSearch(e.target.value)}
          placeholder="Name eingeben, um Spiele zu filtern"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
        />
      </div>

      {/* Group Phase Matches */}
      {view !== 'ko' && matchType === 'group' && (
        <>
          {groups.length === 0 ? (
            <div className="p-8 text-center bg-card rounded-lg border border-border">
              <p className="text-foreground">{t('tournament.matchesContent.noGroups')}</p>
              <p className="text-sm text-muted-foreground">{t('tournament.matchesContent.createGroupsFirst')}</p>
            </div>
          ) : (
            <>
              {/* Group Tabs */}
              <div className="mb-8 flex gap-2 flex-wrap border-b-2 border-border pb-2">
                {groups.map(group => (
                  <Button
                    key={group.id}
                    onClick={() => setSelectedGroupId(group.id)}
                    variant={selectedGroupId === group.id ? 'primary' : 'secondary'}
                    className={cn(
                      'whitespace-nowrap rounded-t-lg',
                      selectedGroupId === group.id && 'font-bold border-b-2 border-b-primary -mb-0.5'
                    )}
                  >
                    {group.name} ({group.participants.length})
                  </Button>
                ))}
              </div>

              {selectedGroup && (
                <>
                  <h3 className="text-foreground">{t('tournament.matches.groupLabel', { name: selectedGroup.name })}</h3>
                  <div className="mb-4 text-muted-foreground">
                    {t('tournament.matches.participantCount', { count: selectedGroup.participants.length })}
                  </div>
                  {isAdmin && (
                    <div className="mb-4 rounded-lg border border-border bg-muted p-3">
                      <div className="flex flex-wrap items-end gap-3">
                        <label className="text-sm text-foreground">
                          Min
                          <input
                            type="number"
                            min={0}
                            value={simMinScore}
                            onChange={(e) => setSimMinScore(parseInt(e.target.value || '0', 10))}
                            className="ml-2 w-20 rounded border border-border bg-background px-2 py-1 text-foreground"
                          />
                        </label>
                        <label className="text-sm text-foreground">
                          Max
                          <input
                            type="number"
                            min={0}
                            value={simMaxScore}
                            onChange={(e) => setSimMaxScore(parseInt(e.target.value || '0', 10))}
                            className="ml-2 w-20 rounded border border-border bg-background px-2 py-1 text-foreground"
                          />
                        </label>
                        <label className="text-sm text-foreground flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={simAllowDraws}
                            onChange={(e) => setSimAllowDraws(e.target.checked)}
                          />
                          Remis erlauben
                        </label>
                        <label className="text-sm text-foreground flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={simOverwrite}
                            onChange={(e) => setSimOverwrite(e.target.checked)}
                          />
                          Bestehende Resultate überschreiben
                        </label>
                        <Button
                          onClick={() => handleSimulatePhase('group')}
                          variant="warning"
                          disabled={simLoadingPhase === 'group'}
                          className="text-sm"
                        >
                          {simLoadingPhase === 'group' ? 'Simulation läuft...' : 'Gruppenspiele simulieren'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {filteredRegularGroupMatches.length === 0 ? (
                    <div className="p-8 text-center bg-card rounded-lg border border-border">
                      <p className="text-foreground">{normalizedPlayerSearch ? 'Keine Spiele für diesen Spieler gefunden.' : t('tournament.matches.noMatches')}</p>
                      {!normalizedPlayerSearch && (
                        <p className="text-sm text-muted-foreground">{t('tournament.matchesContent.generateMatches')}</p>
                      )}
                    </div>
                  ) : (
                    <div className="bg-card border border-border rounded-lg overflow-hidden">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-primary text-primary-foreground">
                            <th className="p-3 text-left">{t('common.round')}</th>
                            <th className="p-3 text-left">{t('common.match')}</th>
                            {tournament.location_id && (
                              <th className="p-3 text-left">{t('liveTicker.spielfeld')}</th>
                            )}
                            <th className="p-3 text-left">{t('tournament.matches.player1')}</th>
                            <th className="p-3 text-left">{t('tournament.matches.player2')}</th>
                            <th className="p-3 text-center">{t('common.result')}</th>
                            <th className="p-3 text-center">{t('tournament.matches.action')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredRegularGroupMatches
                            .sort((a, b) => (a.round - b.round) || (a.match_no - b.match_no))
                            .map((match) => (
                            <tr key={match.id} className="border-b border-border bg-muted">
                              <td className="p-3 text-foreground">{t('common.round')} {match.round}</td>
                              <td className="p-3 text-foreground">{t('common.match')} {match.match_no}</td>
                              {tournament.location_id && (
                                <td className="p-3 text-muted-foreground text-sm">
                                  {getSpielfeldLabel(match.spielfeld_id, match.match_no)}
                                </td>
                              )}
                              <td className="p-3 text-foreground">{getParticipantName(match.player1_id)}</td>
                              <td className="p-3 text-foreground">{getParticipantName(match.player2_id)}</td>
                              <td className="p-3 text-center">
                                {editingMatch === match.id ? (
                                  <div className="flex gap-2 items-center justify-center">
                                    <input
                                      type="number"
                                      value={scoreForm.score1}
                                      onChange={(e) => setScoreForm({ ...scoreForm, score1: e.target.value })}
                                      className={scoreInputClasses}
                                      min="0"
                                    />
                                    <span className="text-foreground">:</span>
                                    <input
                                      type="number"
                                      value={scoreForm.score2}
                                      onChange={(e) => setScoreForm({ ...scoreForm, score2: e.target.value })}
                                      className={scoreInputClasses}
                                      min="0"
                                    />
                                  </div>
                                ) : (
                                  <span className="font-bold text-foreground">
                                    {match.score1 !== null && match.score2 !== null 
                                      ? `${match.score1} : ${match.score2}`
                                      : '- : -'
                                    }
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-center">
                                {canEdit && editingMatch === match.id ? (
                                  <div className="flex gap-2 justify-center">
                                    <Button
                                      onClick={() => handleSave(match.id)}
                                      variant="success"
                                      className="py-1 px-3 text-sm"
                                    >
                                      ✓
                                    </Button>
                                    <Button
                                      onClick={handleCancel}
                                      variant="danger"
                                      className="py-1 px-3 text-sm"
                                    >
                                      ✕
                                    </Button>
                                  </div>
                                ) : canEdit ? (
                                  <Button
                                    onClick={() => handleEdit(match)}
                                    variant="info"
                                    className="py-1 px-3 text-sm"
                                  >
                                    {t('common.result')}
                                  </Button>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {/* Decision Matches */}
                  {(tournament.tie_breaking_rules?.includes('decision_match') || filteredDecisionGroupMatches.length > 0) && (
                    <div className="mt-8">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="m-0 text-foreground">Entscheidungsspiele</h4>
                        {canEdit && (
                          <div className="flex gap-2">
                            <Button
                              onClick={handleGenerateDecisionMatches}
                              variant="info"
                              disabled={decisionMatchesLoading}
                              className="text-sm"
                            >
                              Erzeugen
                            </Button>
                            <Button
                              onClick={handleDeleteDecisionMatches}
                              variant="danger"
                              disabled={decisionMatchesLoading || filteredDecisionGroupMatches.length === 0}
                              className="text-sm"
                            >
                              Löschen
                            </Button>
                          </div>
                        )}
                      </div>
                      {filteredDecisionGroupMatches.length === 0 ? (
                        <div className="p-4 bg-muted rounded-lg border border-border">
                          <p className="m-0 text-sm text-muted-foreground">
                            {normalizedPlayerSearch ? 'Keine Entscheidungsspiele für diesen Spieler gefunden.' : 'Noch keine Entscheidungsspiele vorhanden.'}
                          </p>
                        </div>
                      ) : (
                        <div className="bg-card border border-border rounded-lg overflow-hidden">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="bg-warning text-warning-foreground">
                                <th className="p-3 text-left">{t('common.round')}</th>
                                <th className="p-3 text-left">{t('common.match')}</th>
                                {tournament.location_id && (
                                  <th className="p-3 text-left">{t('liveTicker.spielfeld')}</th>
                                )}
                                <th className="p-3 text-left">{t('tournament.matches.player1')}</th>
                                <th className="p-3 text-left">{t('tournament.matches.player2')}</th>
                                <th className="p-3 text-center">{t('common.result')}</th>
                                <th className="p-3 text-center">{t('tournament.matches.action')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredDecisionGroupMatches
                                .sort((a, b) => (a.round - b.round) || (a.match_no - b.match_no))
                                .map((match) => (
                                  <tr key={match.id} className="border-b border-border bg-muted">
                                    <td className="p-3 text-foreground">{t('common.round')} {match.round}</td>
                                    <td className="p-3 text-foreground">{t('common.match')} {match.match_no}</td>
                                    {tournament.location_id && (
                                      <td className="p-3 text-muted-foreground text-sm">
                                        {getSpielfeldLabel(match.spielfeld_id, match.match_no)}
                                      </td>
                                    )}
                                    <td className="p-3 text-foreground">{getParticipantName(match.player1_id)}</td>
                                    <td className="p-3 text-foreground">{getParticipantName(match.player2_id)}</td>
                                    <td className="p-3 text-center">
                                      {editingMatch === match.id ? (
                                        <div className="flex gap-2 items-center justify-center">
                                          <input
                                            type="number"
                                            value={scoreForm.score1}
                                            onChange={(e) => setScoreForm({ ...scoreForm, score1: e.target.value })}
                                            className={scoreInputClasses}
                                            min="0"
                                          />
                                          <span className="text-foreground">:</span>
                                          <input
                                            type="number"
                                            value={scoreForm.score2}
                                            onChange={(e) => setScoreForm({ ...scoreForm, score2: e.target.value })}
                                            className={scoreInputClasses}
                                            min="0"
                                          />
                                        </div>
                                      ) : (
                                        <span className="font-bold text-foreground">
                                          {match.score1 !== null && match.score2 !== null 
                                            ? `${match.score1} : ${match.score2}`
                                            : '- : -'
                                          }
                                        </span>
                                      )}
                                    </td>
                                    <td className="p-3 text-center">
                                      {canEdit && editingMatch === match.id ? (
                                        <div className="flex gap-2 justify-center">
                                          <Button
                                            onClick={() => handleSave(match.id)}
                                            variant="success"
                                            className="py-1 px-3 text-sm"
                                          >
                                            ✓
                                          </Button>
                                          <Button
                                            onClick={handleCancel}
                                            variant="danger"
                                            className="py-1 px-3 text-sm"
                                          >
                                            ✕
                                          </Button>
                                        </div>
                                      ) : canEdit ? (
                                        <Button
                                          onClick={() => handleEdit(match)}
                                          variant="info"
                                          className="py-1 px-3 text-sm"
                                        >
                                          {t('common.result')}
                                        </Button>
                                      ) : (
                                        <span className="text-muted-foreground">-</span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}

      {/* KO Phase Matches */}
      {view !== 'group' && matchType === 'ko' && (
        <>
          {isAdmin && tournament.has_ko_phase && (
            <div className="mb-4 rounded-lg border border-border bg-muted p-3">
              <div className="flex flex-wrap items-end gap-3">
                <label className="text-sm text-foreground">
                  Min
                  <input
                    type="number"
                    min={0}
                    value={simMinScore}
                    onChange={(e) => setSimMinScore(parseInt(e.target.value || '0', 10))}
                    className="ml-2 w-20 rounded border border-border bg-background px-2 py-1 text-foreground"
                  />
                </label>
                <label className="text-sm text-foreground">
                  Max
                  <input
                    type="number"
                    min={0}
                    value={simMaxScore}
                    onChange={(e) => setSimMaxScore(parseInt(e.target.value || '0', 10))}
                    className="ml-2 w-20 rounded border border-border bg-background px-2 py-1 text-foreground"
                  />
                </label>
                <label className="text-sm text-foreground flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={simAllowDraws}
                    onChange={(e) => setSimAllowDraws(e.target.checked)}
                  />
                  Remis erlauben
                </label>
                <label className="text-sm text-foreground flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={simOverwrite}
                    onChange={(e) => setSimOverwrite(e.target.checked)}
                  />
                  Bestehende Resultate überschreiben
                </label>
                <Button
                  onClick={() => handleSimulatePhase('ko')}
                  variant="warning"
                  disabled={simLoadingPhase === 'ko'}
                  className="text-sm"
                >
                  {simLoadingPhase === 'ko' ? 'Simulation läuft...' : 'KO-Phase simulieren'}
                </Button>
              </div>
            </div>
          )}
          {/* Regenerate Button (always visible if can edit and has KO phase) */}
          {canEdit && tournament.has_ko_phase && !isManualKo && (
            <div className="mb-6 flex justify-end">
              <Button 
                onClick={handleGenerateKOBracket} 
                variant="warning"
                className="text-sm"
              >
                {koMatches.length > 0 ? '🔄 KO-Bracket neu generieren' : '🏆 KO-Bracket generieren'}
              </Button>
            </div>
          )}
          
          {filteredKoMatches.length === 0 ? (
            <div className="p-8 text-center bg-card rounded-lg border border-border">
              <p className="text-foreground">{normalizedPlayerSearch ? 'Keine KO-Spiele für diesen Spieler gefunden.' : 'Noch keine KO-Spiele vorhanden.'}</p>
              {!normalizedPlayerSearch && tournament.has_group_phase ? (
                <p className="text-sm text-muted-foreground">Bitte generieren Sie das KO-Bracket hier.</p>
              ) : !normalizedPlayerSearch ? (
                <p className="text-sm text-muted-foreground">Bitte erstellen Sie das KO-Bracket für dieses Turnier.</p>
              ) : null}
              {canGenerateKo && (
                <div className="mt-4">
                  <Button onClick={handleGenerateKOBracket} variant="danger">
                    🏆 KO-Bracket generieren
                  </Button>
                </div>
              )}
              {isManualKo && (
                <div className="mt-6 text-left bg-muted border border-border rounded-lg p-4">
                  <h4 className="mt-0 text-foreground">Manuelle Paarungen – Runde 1</h4>
                  {tournament.mode === 'combined' && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Nur qualifizierte Teilnehmer. Bitte zuerst Gruppenphase abschließen.
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground mt-1">
                    {tournament.mode === 'combined' ? 'Weisen Sie alle qualifizierten Teilnehmer genau einmal zu (Rest Bye).' : 'Weisen Sie alle Turnier-Teilnehmer genau einmal zu. Leere Slots = Freilos.'}
                  </p>
                  {qualifiedLoading && tournament.mode === 'combined' ? (
                    <p className="text-muted-foreground">Qualifizierte Teilnehmer werden geladen...</p>
                  ) : manualPairs.length === 0 ? (
                    <p className="text-muted-foreground">Teilnehmer werden geladen...</p>
                  ) : r1ParticipantIds.length < 2 && tournament.mode === 'combined' ? (
                    <p className="text-warning">Noch keine qualifizierten Teilnehmer. Bitte Gruppenphase abschließen.</p>
                  ) : (
                    <div className="flex flex-col gap-3 mt-4">
                      {manualPairs.map((pair, index) => {
                        const usedIds = new Set<number>();
                        manualPairs.forEach((p, idx) => {
                          if (idx === index) return;
                          if (p.player1_id) usedIds.add(p.player1_id);
                          if (p.player2_id) usedIds.add(p.player2_id);
                        });
                        const availablePlayer1 = r1ParticipantSource.filter(p => (!usedIds.has(p.id) && p.id !== pair.player2_id) || p.id === pair.player1_id);
                        const availablePlayer2 = r1ParticipantSource.filter(p => (!usedIds.has(p.id) && p.id !== pair.player1_id) || p.id === pair.player2_id);
                        return (
                          <div key={`pair-${index}`} className="flex gap-2 items-center">
                            <span className="min-w-[60px] text-muted-foreground">Spiel {index + 1}</span>
                            <select
                              value={pair.player1_id ?? ''}
                              onChange={(e) => updateManualPair(index, 'player1_id', e.target.value)}
                              className="flex-1 py-2 px-2 border border-border rounded-md bg-background text-foreground"
                            >
                              <option value="">-</option>
                              {availablePlayer1.map((p: { id: number; first_name: string; last_name: string }) => (
                                <option key={p.id} value={p.id}>
                                  {p.first_name} {p.last_name}
                                </option>
                              ))}
                            </select>
                            <span className="text-muted-foreground">vs</span>
                            <select
                              value={pair.player2_id ?? ''}
                              onChange={(e) => updateManualPair(index, 'player2_id', e.target.value)}
                              className="flex-1 py-2 px-2 border border-border rounded-md bg-background text-foreground"
                            >
                              <option value="">-</option>
                              {availablePlayer2.map((p: { id: number; first_name: string; last_name: string }) => (
                                <option key={p.id} value={p.id}>
                                  {p.first_name} {p.last_name}
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {manualError && (
                    <div className="mt-4 p-3 bg-destructive/20 border border-destructive rounded-lg text-destructive">
                      {manualError}
                    </div>
                  )}
                  <div className="mt-4 flex justify-end">
                    <Button onClick={handleSaveManualPairs} variant="success" disabled={manualSaving || manualPairs.length === 0}>
                      {manualSaving ? t('common.savingShort') : `${t('common.round')} 1 ${t('common.save').toLowerCase()}`}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* View Mode Toggle */}
              <div className="mb-8 flex justify-between items-center">
                <label className="font-bold text-foreground">
                  Ansicht:
                </label>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setKoViewMode('bracket')}
                    variant={koViewMode === 'bracket' ? 'danger' : 'secondary'}
                    className={cn(koViewMode === 'bracket' && 'font-bold')}
                  >
                    {t('tournament.matchesContent.koBracket')}
                  </Button>
                  <Button
                    onClick={() => setKoViewMode('table')}
                    variant={koViewMode === 'table' ? 'danger' : 'secondary'}
                    className={cn(koViewMode === 'table' && 'font-bold')}
                  >
                    {t('tournament.detail.tabs.tables')}
                  </Button>
                </div>
              </div>

              {/* Manuelle Paarungen Runde 1, 2, ? und Bronze */}
              {isManualKo && canEdit && (() => {
                const rounds = Array.from(new Set(filteredKoMatches.map(m => m.round))).filter(r => r >= 1 || r === 99).sort((a, b) => (a === 99 ? 99 : a) - (b === 99 ? 99 : b));
                const maxMainRound = Math.max(...koMatches.filter(m => m.round !== 99 && m.round >= 1).map(m => m.round), 1);
                const semiRound = maxMainRound >= 2 ? maxMainRound - 1 : 2;
                return (
                  <div className="mb-8 flex flex-col gap-6">
                    {rounds.map(roundNum => {
                      const pairs = roundPairingsEdits[roundNum] ?? [];
                      const winnersOrLosers = roundNum === 1 ? [] : (roundNum === 99 ? getLosersOfRound(semiRound) : getWinnersOfRound(roundNum - 1));
                      const allowedIds = roundNum === 1
                        ? r1ParticipantIds
                        : (winnersOrLosers.length > 0 ? winnersOrLosers : (roundNum === 99 ? getParticipantsInRound(semiRound) : getParticipantsInRound(roundNum - 1)));
                      const usedInRound = new Set<number>();
                      pairs.forEach(p => {
                        if (p.player1_id != null) usedInRound.add(p.player1_id);
                        if (p.player2_id != null) usedInRound.add(p.player2_id);
                      });
                      const roundLabel = roundNum === 99 ? 'Bronze (Platz 3)' : `Runde ${roundNum}`;
                      return (
                        <div key={roundNum} className="p-4 bg-muted border border-border rounded-lg">
                          <h4 className="mt-0 mb-3 text-foreground">{roundLabel}</h4>
                          <p className="text-sm text-muted-foreground mb-4">
                            {roundNum === 1 ? (tournament.mode === 'combined' ? t('tournament.matchesContent.qualifiedParticipants') : t('tournament.matchesContent.participantsAssign')) : roundNum === 99 ? 'Halbfinal-Verlierer' : t('tournament.matchesContent.winnerOfRound', { round: roundNum - 1 })}
                          </p>
                          <div className="flex flex-col gap-2">
                            {pairs.map((pair) => {
                              const usedElse = new Set<number>();
                              pairs.forEach(p => {
                                if (p.match_no === pair.match_no) return;
                                if (p.player1_id != null) usedElse.add(p.player1_id);
                                if (p.player2_id != null) usedElse.add(p.player2_id);
                              });
                              const opt1 = allowedIds.filter(id => id !== pair.player2_id && (!usedElse.has(id) || id === pair.player1_id));
                              const opt2 = allowedIds.filter(id => id !== pair.player1_id && (!usedElse.has(id) || id === pair.player2_id));
                              return (
                                <div key={pair.match_no} className="flex gap-2 items-center">
                                  <span className="min-w-[80px] text-muted-foreground">Spiel {pair.match_no}</span>
                                  <select
                                    value={pair.player1_id ?? ''}
                                    onChange={(e) => updateRoundPairing(roundNum, pair.match_no, 'player1_id', e.target.value ? parseInt(e.target.value) : null)}
                                    className="flex-1 py-2 px-2 border border-border rounded-md bg-background text-foreground"
                                  >
                                    <option value="">-</option>
                                    {opt1.map(id => (
                                      <option key={id} value={id}>{getParticipantNameById(id)}</option>
                                    ))}
                                  </select>
                                  <span className="text-muted-foreground">vs</span>
                                  <select
                                    value={pair.player2_id ?? ''}
                                    onChange={(e) => updateRoundPairing(roundNum, pair.match_no, 'player2_id', e.target.value ? parseInt(e.target.value) : null)}
                                    className="flex-1 py-2 px-2 border border-border rounded-md bg-background text-foreground"
                                  >
                                    <option value="">-</option>
                                    {opt2.map(id => (
                                      <option key={id} value={id}>{getParticipantNameById(id)}</option>
                                    ))}
                                  </select>
                                </div>
                              );
                            })}
                          </div>
                          <div className="mt-4">
                            <Button onClick={() => handleSaveRoundPairings(roundNum)} variant="success" disabled={savingRound !== null}>
                              {savingRound === roundNum ? t('common.savingShort') : `${roundNum === 99 ? 'Bronze' : `${t('common.round')} ${roundNum}`} ${t('common.save').toLowerCase()}`}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Bracket View */}
              {koViewMode === 'bracket' && (
                <div className="relative">
                  {/* Edit Dialog Overlay */}
                  {editingMatch && (
                    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-[1000]">
                      <div className="bg-card p-8 rounded-lg min-w-[400px] shadow-lg border border-border">
                        <h3 className="mt-0 mb-6 text-foreground">{t('tournament.koBracket.enter')}</h3>
                        {(() => {
                          const match = koMatches.find(m => m.id === editingMatch);
                          if (!match) return null;
                          return (
                            <>
                              <div className="mb-4">
                                <div className="mb-2 font-bold text-foreground">{getParticipantNameById(match.player1_id)}</div>
                                <div className="mb-2 font-bold text-foreground">{getParticipantNameById(match.player2_id)}</div>
                              </div>
                              <div className="flex gap-4 items-center mb-6">
                                <input
                                  type="number"
                                  value={scoreForm.score1}
                                  onChange={(e) => setScoreForm({ ...scoreForm, score1: e.target.value })}
                                  className="w-20 py-2 text-center border-2 border-border rounded-md text-xl bg-background text-foreground"
                                  min="0"
                                  autoFocus
                                />
                                <span className="text-2xl font-bold text-foreground">:</span>
                                <input
                                  type="number"
                                  value={scoreForm.score2}
                                  onChange={(e) => setScoreForm({ ...scoreForm, score2: e.target.value })}
                                  className="w-20 py-2 text-center border-2 border-border rounded-md text-xl bg-background text-foreground"
                                  min="0"
                                />
                              </div>
                              {canEdit && (
                                <div className="flex gap-4 justify-end">
                                  <Button
                                    onClick={handleCancel}
                                    variant="secondary"
                                  >
                                    {t('common.cancel')}
                                  </Button>
                                  <Button
                                    onClick={() => handleSave(match.id)}
                                    variant="success"
                                  >
                                    {t('common.save')}
                                  </Button>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  <KOBracket
                    matches={filteredKoMatches}
                    participants={participants}
                    onMatchEdit={handleMatchEditClick}
                    editingMatchId={editingMatch}
                    drawMode={tournament.ko_distribution}
                    tournamentId={tournamentId}
                    koDistribution={tournament.ko_distribution}
                    onRefresh={refreshKoMatches}
                  />
                </div>
              )}

              {/* Table View */}
              {koViewMode === 'table' && (
                <div className="bg-card border border-border rounded-lg overflow-hidden">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-destructive text-foreground">
                        <th className="p-3 text-left">{t('common.round')}</th>
                        <th className="p-3 text-left">{t('common.match')}</th>
                        {tournament.location_id && (
                          <th className="p-3 text-left">{t('liveTicker.spielfeld')}</th>
                        )}
                        <th className="p-3 text-left">{t('tournament.matches.player1')}</th>
                        <th className="p-3 text-left">{t('tournament.matches.player2')}</th>
                        <th className="p-3 text-center">{t('common.result')}</th>
                        <th className="p-3 text-center">{t('tournament.matches.action')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredKoMatches
                        .sort((a, b) => (a.round - b.round) || (a.match_no - b.match_no))
                        .map((match) => (
                        <tr key={match.id} className="border-b border-border bg-muted">
                          <td className="p-3 text-foreground">{t('common.round')} {match.round === 99 ? 'Bronze' : match.round}</td>
                          <td className="p-3 text-foreground">{t('common.match')} {match.match_no}</td>
                          {tournament.location_id && (
                            <td className="p-3 text-sm">
                              {canEdit && spielfelderList.length > 0 ? (
                                <select
                                  value={match.spielfeld_id ?? ''}
                                  onChange={(e) => handleKoMatchSpielfeldChange(match.id, e.target.value === '' ? null : Number(e.target.value))}
                                  className="py-1.5 px-2 text-sm border border-border rounded-md bg-muted text-foreground min-w-[120px]"
                                >
                                  <option value="">—</option>
                                  {spielfelderList.map((sf) => (
                                    <option key={sf.id} value={sf.id}>{sf.name}</option>
                                  ))}
                                </select>
                              ) : (
                                <span className="text-muted-foreground">
                                  {getSpielfeldLabel(match.spielfeld_id, match.match_no)}
                                </span>
                              )}
                            </td>
                          )}
                          <td className="p-3 text-foreground">{getKoParticipantLabel(match, 1)}</td>
                          <td className="p-3 text-foreground">{getKoParticipantLabel(match, 2)}</td>
                          <td className="p-3 text-center">
                            {editingMatch === match.id ? (
                              <div className="flex gap-2 items-center justify-center">
                                <input
                                  type="number"
                                  value={scoreForm.score1}
                                  onChange={(e) => setScoreForm({ ...scoreForm, score1: e.target.value })}
                                  className={scoreInputClasses}
                                  min="0"
                                />
                                <span className="text-foreground">:</span>
                                <input
                                  type="number"
                                  value={scoreForm.score2}
                                  onChange={(e) => setScoreForm({ ...scoreForm, score2: e.target.value })}
                                  className={scoreInputClasses}
                                  min="0"
                                />
                              </div>
                            ) : (
                              <span className="font-bold text-foreground">
                                {match.score1 !== null && match.score2 !== null 
                                  ? `${match.score1} : ${match.score2}`
                                  : '- : -'
                                }
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {canEdit && editingMatch === match.id ? (
                              <div className="flex gap-2 justify-center">
                                <Button
                                  onClick={() => handleSave(match.id)}
                                  variant="success"
                                  className="py-1 px-3 text-sm"
                                >
                                  ✓
                                </Button>
                                <Button
                                  onClick={handleCancel}
                                  variant="danger"
                                  className="py-1 px-3 text-sm"
                                >
                                  ✕
                                </Button>
                              </div>
                            ) : canEdit && (canEnterKoResult(match) || (match.score1 !== null && match.score2 !== null)) ? (
                              <div className="flex gap-2 justify-center">
                                {canEnterKoResult(match) && (
                                  <Button
                                    onClick={() => handleEdit(match)}
                                    variant="info"
                                    className="py-1 px-3 text-sm"
                                  >
                                    {t('common.result')}
                                  </Button>
                                )}
                              </div>
                            ) : canEdit && !canEnterKoResult(match) ? (
                              <span className="text-xs text-muted-foreground">{t('tournament.matchesContent.drawInProgress')}</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
