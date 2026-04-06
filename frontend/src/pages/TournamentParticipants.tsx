// Tournament Participants Page
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { authService } from '../services/authService';
import { useAuth } from '../contexts/AuthContext';
import { tournamentService } from '../services/tournamentService';
import { participantService } from '../services/participantService';
import { groupService } from '../services/groupService';
import { Tournament, Participant } from '../types';
import { getSeedingVisibility, isSeedingUiApplicable } from '../domain/tournamentSeeding';
import { useNavigate, useParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button, Card, Input } from '@/components/ui';

export default function TournamentParticipants() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const tournamentId = id ? parseInt(id) : 0;
  const { t } = useTranslation();
  const { canEdit } = useAuth();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [allParticipants, setAllParticipants] = useState<Participant[]>([]);
  const [tournamentParticipants, setTournamentParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<number[]>([]);
  const [adding, setAdding] = useState(false);
  const [participantSearch, setParticipantSearch] = useState('');
  const [participantSortBy, setParticipantSortBy] = useState<'first_name' | 'last_name'>('last_name');
  const [seededParticipantIds, setSeededParticipantIds] = useState<number[]>([]);
  const [savingSeeds, setSavingSeeds] = useState(false);
  const [groupsExist, setGroupsExist] = useState(false);

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate('/login');
      return;
    }
    if (tournamentId) {
      loadData();
    }
  }, [tournamentId, navigate]);

  const loadData = async () => {
    try {
      const tournamentData = await tournamentService.getById(tournamentId);
      const [allParticipantsData, tournamentParticipantsData, groupsList] = await Promise.all([
        participantService.getAll(),
        participantService.getTournamentParticipants(tournamentId),
        groupService.getGroups(tournamentId).catch(() => []),
      ]);
      setTournament(tournamentData);
      setAllParticipants(allParticipantsData);
      setTournamentParticipants(tournamentParticipantsData);
      setGroupsExist(Array.isArray(groupsList) && groupsList.length > 0);

      if (isSeedingUiApplicable(tournamentData)) {
        try {
          const seededState = await tournamentService.getSeededParticipants(tournamentId);
          setSeededParticipantIds(seededState.seeded_participant_ids || []);
        } catch (err) {
          console.error('Failed to load seeded participants:', err);
          setSeededParticipantIds([]);
        }
      } else {
        setSeededParticipantIds([]);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleParticipant = (participantId: number) => {
    setSelectedParticipantIds(prev => {
      if (prev.includes(participantId)) {
        return prev.filter(id => id !== participantId);
      } else {
        return [...prev, participantId];
      }
    });
  };

  const handleAddParticipants = async () => {
    if (selectedParticipantIds.length === 0) {
      alert(t('tournament.participants.selectAtLeastOne'));
      return;
    }

    setAdding(true);

    try {
      const result = await participantService.addTournamentParticipants(tournamentId, selectedParticipantIds);
      alert(t('tournament.participants.addedResult', { added: result.added, skipped: result.skipped }));
      setShowAddForm(false);
      setSelectedParticipantIds([]);
      loadData();
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { detail?: string } } };
      console.error('Failed to add participants:', err);
      alert(errObj.response?.data?.detail || t('tournament.participants.addError'));
    } finally {
      setAdding(false);
    }
  };

  const handleSelectAllAvailable = () => {
    setSelectedParticipantIds(sortedAvailableParticipants.map(participant => participant.id));
  };

  const handleClearSelected = () => {
    setSelectedParticipantIds([]);
  };

  const handleRemoveParticipant = async (participantId: number) => {
    if (!confirm(t('tournament.participants.removeConfirm'))) {
      return;
    }

    try {
      await participantService.removeTournamentParticipant(tournamentId, participantId);
      loadData();
    } catch (err: unknown) {
      console.error('Failed to remove participant:', err);
      alert(t('tournament.participants.removeError'));
    }
  };

  const seedingApplies = !!tournament && isSeedingUiApplicable(tournament);

  const handleToggleSeed = (participantId: number) => {
    if (!canEdit || groupsExist) return;
    setSeededParticipantIds((prev) =>
      prev.includes(participantId) ? prev.filter((x) => x !== participantId) : [...prev, participantId]
    );
  };

  const handleSaveSeeds = async () => {
    if (!tournament || !canEdit || groupsExist) return;
    setSavingSeeds(true);
    try {
      await tournamentService.setSeededParticipants(tournament.id, seededParticipantIds);
      alert(t('tournament.participants.seedingSaveSuccess'));
      await loadData();
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { detail?: string } } };
      alert(errObj.response?.data?.detail || t('tournament.participants.seedingSaveError'));
    } finally {
      setSavingSeeds(false);
    }
  };

  if (loading) return <div className="p-8">{t('common.loading')}</div>;
  if (!tournament) return <div className="p-8">{t('tournament.detail.notFound')}</div>;

  // Get participants that are not yet in the tournament
  const availableParticipants = allParticipants.filter(
    p => !tournamentParticipants.some(tp => tp.id === p.id)
  );
  const searchLower = participantSearch.trim().toLowerCase();
  const filteredAvailable = searchLower
    ? availableParticipants.filter(
        p =>
          (p.first_name || '').toLowerCase().includes(searchLower) ||
          (p.last_name || '').toLowerCase().includes(searchLower) ||
          (p.club || '').toLowerCase().includes(searchLower) ||
          (p.nickname || '').toLowerCase().includes(searchLower)
      )
    : availableParticipants;
  const sortedAvailableParticipants = [...filteredAvailable].sort((a, b) => {
    if (participantSortBy === 'last_name') {
      const lastCompare = (a.last_name || '').localeCompare(b.last_name || '', 'de', { sensitivity: 'base' });
      if (lastCompare !== 0) return lastCompare;
      return (a.first_name || '').localeCompare(b.first_name || '', 'de', { sensitivity: 'base' });
    }
    const firstCompare = (a.first_name || '').localeCompare(b.first_name || '', 'de', { sensitivity: 'base' });
    if (firstCompare !== 0) return firstCompare;
    return (a.last_name || '').localeCompare(b.last_name || '', 'de', { sensitivity: 'base' });
  });

  const seedingVisibility = getSeedingVisibility(tournament);
  const labelDistribution = (gd: string) => {
    const n = String(gd ?? '').trim().toLowerCase();
    if (n === 'random') return t('common.groupDistribution.randomLabel');
    if (n === 'seeded') return t('common.groupDistribution.seededLabel');
    if (n === 'manual') return t('common.groupDistribution.manualLabel');
    return gd || '—';
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto bg-background min-h-screen text-foreground">
      <div className="flex justify-between mb-8">
        <div>
          <h1>{tournament.name}</h1>
          <p className="text-muted-foreground mt-2">{t('tournament.participants.title')}</p>
        </div>
        <div className="flex gap-4">
          {tournament.has_group_phase && (
            <Button variant="info" onClick={() => navigate(`/tournaments/${tournamentId}/groups`)}>
              {t('tournament.participants.groups')}
            </Button>
          )}
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            {t('common.back')}
          </Button>
        </div>
      </div>

      <div className="flex justify-between items-center mb-8">
        <h2>{t('tournament.participants.count', { count: tournamentParticipants.length })}</h2>
        {!showAddForm && (
          <Button onClick={() => setShowAddForm(true)}>
            {t('tournament.participants.add')}
          </Button>
        )}
      </div>

      {seedingVisibility.kind === 'blocked' && seedingVisibility.reason === 'need_two_groups' && (
        <Card className="mb-8 p-4 border-amber-500/50 bg-amber-950/20 dark:bg-amber-950/30">
          <p className="m-0 text-sm text-foreground">
            {t('tournament.participants.seedingBlockedNeedTwoGroups', { count: seedingVisibility.groupsCount })}
          </p>
        </Card>
      )}
      {seedingVisibility.kind === 'hidden' && seedingVisibility.reason === 'not_seeded_distribution' && (
        <Card className="mb-8 p-4 border border-border bg-muted/50">
          <p className="m-0 text-sm text-foreground">
            {t('tournament.participants.seedingHiddenReasonDistribution', {
              distribution: labelDistribution(seedingVisibility.distribution),
            })}
          </p>
        </Card>
      )}

      {seedingApplies && (
        <Card className="mb-8 p-4 border border-border bg-card">
          <h3 className="m-0 text-lg font-semibold text-foreground">{t('tournament.participants.seedingTitle')}</h3>
          <p className="mt-2 mb-0 text-sm text-muted-foreground">{t('tournament.participants.seedingHint')}</p>
          {tournamentParticipants.length === 0 && (
            <p className="mt-2 mb-0 text-sm text-muted-foreground">{t('tournament.participants.seedingNoParticipants')}</p>
          )}
          {tournamentParticipants.length > 0 && canEdit && (
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {groupsExist && (
                <p className="m-0 text-sm text-warning">{t('tournament.participants.seedingGroupsLocked')}</p>
              )}
              <Button
                type="button"
                onClick={handleSaveSeeds}
                disabled={savingSeeds || groupsExist}
                className={cn((savingSeeds || groupsExist) && 'opacity-60 cursor-not-allowed')}
              >
                {savingSeeds ? t('tournament.participants.seedingSaving') : t('tournament.participants.seedingSave')}
              </Button>
            </div>
          )}
          {tournamentParticipants.length > 0 && (
            <p className="mt-3 mb-0 text-sm text-muted-foreground">
              {t('tournament.participants.seedingCount', { count: seededParticipantIds.length })}
            </p>
          )}
        </Card>
      )}

      {showAddForm && (
        <Card className="mb-8 p-6 bg-muted border border-border">
          <h2>{t('tournament.participants.addTitle')}</h2>

          {availableParticipants.length === 0 ? (
            <p>{t('tournament.participants.allRegistered')}</p>
          ) : (
            <>
              <p className="mb-4 text-muted-foreground">
                {t('tournament.participants.selectPrompt', { count: selectedParticipantIds.length })}
              </p>

              <div className="mb-4">
                <Input
                  type="text"
                  placeholder={t('tournament.participants.searchPlaceholder')}
                  value={participantSearch}
                  onChange={(e) => setParticipantSearch(e.target.value)}
                  className="max-w-[400px] mb-2"
                />
                <div className="flex gap-2 items-center flex-wrap">
                  <span className="text-sm text-muted-foreground">{t('tournament.participants.sortBy')}</span>
                  <Button
                    type="button"
                    variant={participantSortBy === 'last_name' ? 'info' : 'outline'}
                    size="sm"
                    onClick={() => setParticipantSortBy('last_name')}
                  >
                    {t('tournament.participants.sortLastName')}
                  </Button>
                  <Button
                    type="button"
                    variant={participantSortBy === 'first_name' ? 'info' : 'outline'}
                    size="sm"
                    onClick={() => setParticipantSortBy('first_name')}
                  >
                    {t('tournament.participants.sortFirstName')}
                  </Button>
                </div>
              </div>

              <div className="flex gap-3 mb-3">
                <Button
                  variant="info"
                  size="sm"
                  onClick={handleSelectAllAvailable}
                  disabled={availableParticipants.length === 0}
                >
                  {t('tournament.participants.selectAll')}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleClearSelected}
                  disabled={selectedParticipantIds.length === 0}
                >
                  {t('tournament.participants.clearAll')}
                </Button>
              </div>

              <div className="max-h-[300px] overflow-y-auto bg-muted border border-border rounded-md p-4">
                {sortedAvailableParticipants.map(participant => (
                  <label
                    key={participant.id}
                    className={cn(
                      'flex items-center p-2 cursor-pointer border-b border-border last:border-b-0'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selectedParticipantIds.includes(participant.id)}
                      onChange={() => handleToggleParticipant(participant.id)}
                      className="mr-3 cursor-pointer"
                    />
                    <span>
                      <strong>{participant.first_name} {participant.last_name}</strong>
                      {participant.club && <span className="text-muted-foreground ml-2">({participant.club})</span>}
                    </span>
                  </label>
                ))}
              </div>

              <div className="flex gap-4 mt-4">
                <Button
                  onClick={handleAddParticipants}
                  disabled={adding || selectedParticipantIds.length === 0}
                >
                  {adding ? t('tournament.participants.adding') : t('tournament.participants.addSelected')}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => { setShowAddForm(false); setSelectedParticipantIds([]); }}
                >
                  {t('common.cancel')}
                </Button>
              </div>
            </>
          )}
        </Card>
      )}

      {tournamentParticipants.length === 0 ? (
        <p>{t('tournament.participants.noParticipants')}</p>
      ) : (
        <div className="bg-muted border border-border rounded-lg overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-border bg-muted">
                {seedingApplies && (
                  <th className="p-3 text-left w-[100px]">{t('tournament.participants.seedingColumn')}</th>
                )}
                <th className="p-3 text-left">{t('common.name')}</th>
                <th className="p-3 text-left">{t('common.table.club')}</th>
                <th className="p-3 text-left">{t('participants.scoliaId')}</th>
                <th className="p-3 text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {tournamentParticipants.map(participant => (
                <tr key={participant.id} className="border-b border-border">
                  {seedingApplies && (
                    <td className="p-3 align-middle">
                      <input
                        type="checkbox"
                        checked={seededParticipantIds.includes(participant.id)}
                        disabled={!canEdit || groupsExist}
                        onChange={() => handleToggleSeed(participant.id)}
                        className="h-4 w-4 cursor-pointer disabled:cursor-not-allowed"
                        title={groupsExist ? t('tournament.participants.seedingGroupsLocked') : undefined}
                      />
                    </td>
                  )}
                  <td className="p-3 font-bold">
                    {participant.first_name} {participant.last_name}
                  </td>
                  <td className="p-3">{participant.club || '-'}</td>
                  <td className="p-3">{participant.scolia_id || '-'}</td>
                  <td className="p-3 text-right">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRemoveParticipant(participant.id)}
                    >
                      {t('common.remove')}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
