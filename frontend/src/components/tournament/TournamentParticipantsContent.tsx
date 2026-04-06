// Tournament Participants Content (for Tab)
import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { participantService } from '../../services/participantService';
import { tournamentService } from '../../services/tournamentService';
import { groupService } from '../../services/groupService';
import { Participant, Tournament } from '../../types';
import { getSeedingVisibility, isSeedingUiApplicable } from '../../domain/tournamentSeeding';
import { cn } from '@/lib/utils';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { Input } from '../ui/Input';
import { Label } from '../ui/label';

interface TournamentParticipantsContentProps {
  tournamentId: number;
  tournament: Tournament;
  /** Bei Änderung (z. B. nach Bearbeiten) Turnier neu laden – verhindert veraltete Auslosungsart in der Tab-Ansicht */
  tournamentRevision?: string;
}

export default function TournamentParticipantsContent({
  tournamentId,
  tournament,
  tournamentRevision,
}: TournamentParticipantsContentProps) {
  const { t } = useTranslation();
  const { canEdit } = useAuth();
  const tournamentPropRef = useRef(tournament);
  tournamentPropRef.current = tournament;
  const [resolvedTournament, setResolvedTournament] = useState<Tournament | null>(null);
  const [allParticipants, setAllParticipants] = useState<Participant[]>([]);
  const [tournamentParticipants, setTournamentParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<number[]>([]);
  const [adding, setAdding] = useState(false);
  const [participantSearch, setParticipantSearch] = useState('');
  const [participantSortBy, setParticipantSortBy] = useState<'first_name' | 'last_name'>('last_name');
  const [seededParticipantIds, setSeededParticipantIds] = useState<number[]>([]);
  const [savingSeeds, setSavingSeeds] = useState(false);
  const [groupsExist, setGroupsExist] = useState(false);
  const [manualFormData, setManualFormData] = useState({
    first_name: '',
    last_name: '',
    club: '',
    scolia_id: '',
    email: '',
    nickname: ''
  });

  const loadData = useCallback(async () => {
    try {
      let fresh: Tournament;
      try {
        fresh = await tournamentService.getById(tournamentId);
      } catch (e) {
        console.error('TournamentParticipantsContent: getById failed, fallback to parent state', e);
        fresh = tournamentPropRef.current;
      }
      setResolvedTournament(fresh);

      const [allParticipantsData, tournamentParticipantsData, groupsList] = await Promise.all([
        participantService.getAll(),
        participantService.getTournamentParticipants(tournamentId),
        groupService.getGroups(tournamentId).catch(() => []),
      ]);
      setAllParticipants(allParticipantsData);
      setTournamentParticipants(tournamentParticipantsData);
      setGroupsExist(Array.isArray(groupsList) && groupsList.length > 0);

      if (isSeedingUiApplicable(fresh)) {
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
  }, [tournamentId]);

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData, tournamentRevision]);

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
    } catch (err: any) {
      console.error('Failed to add participants:', err);
      alert(err.response?.data?.detail || t('tournament.participants.addError'));
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
    } catch (err: any) {
      console.error('Failed to remove participant:', err);
      alert(t('tournament.participants.removeError'));
    }
  };

  const handleToggleSeed = (participantId: number) => {
    if (!canEdit || groupsExist) return;
    setSeededParticipantIds((prev) =>
      prev.includes(participantId) ? prev.filter((x) => x !== participantId) : [...prev, participantId]
    );
  };

  const handleSaveSeeds = async () => {
    if (!canEdit || groupsExist) return;
    const tid = (resolvedTournament ?? tournament).id;
    setSavingSeeds(true);
    try {
      await tournamentService.setSeededParticipants(tid, seededParticipantIds);
      alert(t('tournament.participants.seedingSaveSuccess'));
      await loadData();
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { detail?: string } } };
      alert(errObj.response?.data?.detail || t('tournament.participants.seedingSaveError'));
    } finally {
      setSavingSeeds(false);
    }
  };

  const handleManualFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setManualFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddManualParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!manualFormData.first_name.trim()) {
      alert('Bitte geben Sie mindestens den Vornamen ein.');
      return;
    }

    setAdding(true);

    try {
      await participantService.addManualTournamentParticipant(tournamentId, {
        first_name: manualFormData.first_name.trim(),
        last_name: manualFormData.last_name.trim(),
        club: manualFormData.club.trim() || undefined,
        scolia_id: manualFormData.scolia_id.trim() || undefined,
        email: manualFormData.email.trim() || undefined,
        nickname: manualFormData.nickname.trim() || undefined,
      });
      setShowManualForm(false);
      setManualFormData({
        first_name: '',
        last_name: '',
        club: '',
        scolia_id: '',
        email: '',
        nickname: ''
      });
      loadData();
      alert('Teilnehmer erfolgreich hinzugefügt!');
    } catch (err: any) {
      console.error('Failed to add manual participant:', err);
      alert(err.response?.data?.detail || t('tournament.participants.addError'));
    } finally {
      setAdding(false);
    }
  };

  if (loading) return <div className="text-foreground">{t('common.loading')}</div>;

  const tForUi = resolvedTournament ?? tournament;
  const seedingVisibility = getSeedingVisibility(tForUi);
  const seedingApplies = isSeedingUiApplicable(tForUi);
  const labelDistribution = (gd: string) => {
    const n = String(gd ?? '').trim().toLowerCase();
    if (n === 'random') return t('common.groupDistribution.randomLabel');
    if (n === 'seeded') return t('common.groupDistribution.seededLabel');
    if (n === 'manual') return t('common.groupDistribution.manualLabel');
    return gd || '—';
  };

  // Get participants that are not yet in the tournament
  const availableParticipants = allParticipants.filter(
    p => !tournamentParticipants.some(tp => tp.id === p.id)
  );
  // Filter by search (Vorname, Nachname, Verein, Spitzname)
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

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-foreground">{t('tournament.participants.count', { count: tournamentParticipants.length })}</h2>
        {canEdit && !showAddForm && !showManualForm && (
          <div className="flex gap-2">
            <Button 
              variant="success"
              onClick={() => setShowAddForm(true)}
            >
              + Aus Liste hinzufügen
            </Button>
            <Button 
              variant="info"
              onClick={() => setShowManualForm(true)}
            >
              + Manuell eintragen
            </Button>
          </div>
        )}
      </div>

      {seedingVisibility.kind === 'blocked' && seedingVisibility.reason === 'need_two_groups' && (
        <Card className="mb-6 border-amber-500/50 bg-amber-950/20 dark:bg-amber-950/30">
          <CardContent className="pt-6 text-sm text-foreground">
            {t('tournament.participants.seedingBlockedNeedTwoGroups', { count: seedingVisibility.groupsCount })}
          </CardContent>
        </Card>
      )}
      {seedingVisibility.kind === 'hidden' && seedingVisibility.reason === 'not_seeded_distribution' && (
        <Card className="mb-6 border-border bg-muted/50">
          <CardContent className="pt-6 text-sm text-foreground">
            {t('tournament.participants.seedingHiddenReasonDistribution', {
              distribution: labelDistribution(seedingVisibility.distribution),
            })}
          </CardContent>
        </Card>
      )}

      {showAddForm && (
        <Card className="mb-8">
          <CardContent className="pt-6">
            <h3 className="text-foreground mt-0 font-semibold">{t('tournament.participants.addTitle')}</h3>
            
            {availableParticipants.length === 0 ? (
              <p className="text-muted-foreground">{t('tournament.participants.allRegistered')}</p>
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
                    className="mb-2"
                  />
                  <div className="flex gap-2 items-center flex-wrap">
                    <span className="text-sm text-muted-foreground">{t('tournament.participants.sortBy')}</span>
                    <Button
                      variant={participantSortBy === 'last_name' ? 'primary' : 'secondary'}
                      onClick={() => setParticipantSortBy('last_name')}
                      className="py-1.5 px-2.5 text-sm"
                    >
                      {t('tournament.participants.sortLastName')}
                    </Button>
                    <Button
                      variant={participantSortBy === 'first_name' ? 'primary' : 'secondary'}
                      onClick={() => setParticipantSortBy('first_name')}
                      className="py-1.5 px-2.5 text-sm"
                    >
                      {t('tournament.participants.sortFirstName')}
                    </Button>
                  </div>
                </div>

                <div className="flex gap-3 mb-3">
                  <Button
                    variant="info"
                    onClick={handleSelectAllAvailable}
                    disabled={availableParticipants.length === 0}
                    className="py-1.5 px-3 text-sm"
                  >
                    {t('tournament.participants.selectAll')}
                  </Button>
                  <Button
                    variant="danger"
                    onClick={handleClearSelected}
                    disabled={selectedParticipantIds.length === 0}
                    className="py-1.5 px-3 text-sm"
                  >
                    {t('tournament.participants.clearAll')}
                  </Button>
                </div>
                
                <div className="max-h-[300px] overflow-y-auto bg-muted border border-border rounded-lg p-4">
                  {sortedAvailableParticipants.map(participant => (
                    <label 
                      key={participant.id}
                      className={cn(
                        "flex items-center p-3 cursor-pointer border-b border-border last:border-b-0 text-foreground",
                        "hover:bg-accent/50"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selectedParticipantIds.includes(participant.id)}
                        onChange={() => handleToggleParticipant(participant.id)}
                        className="mr-3 cursor-pointer w-4 h-4"
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
                    variant="primary"
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
          </CardContent>
        </Card>
      )}

      {showManualForm && (
        <Card className="mb-8 border-warning">
          <CardContent className="pt-6">
            <h3 className="text-foreground mt-0 font-semibold">Teilnehmer manuell eintragen</h3>
            <p className="mb-4 text-muted-foreground text-sm">
              Geben Sie die Daten des Teilnehmers ein. Dieser wird nur für dieses Turnier erstellt.
            </p>
            
            <form onSubmit={handleAddManualParticipant}>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <Label className="block mb-2 font-bold text-foreground">
                    {t('participants.firstName')}
                  </Label>
                  <Input
                    type="text"
                    name="first_name"
                    value={manualFormData.first_name}
                    onChange={handleManualFormChange}
                    required
                    className="w-full"
                  />
                </div>
                <div>
                  <Label className="block mb-2 font-bold text-foreground">
                    {t('participants.lastName')}
                  </Label>
                  <Input
                    type="text"
                    name="last_name"
                    value={manualFormData.last_name}
                    onChange={handleManualFormChange}
                    className="w-full"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <Label className="block mb-2 text-foreground">
                    {t('participants.club')}
                  </Label>
                  <Input
                    type="text"
                    name="club"
                    value={manualFormData.club}
                    onChange={handleManualFormChange}
                    className="w-full"
                  />
                </div>
                <div>
                  <Label className="block mb-2 text-foreground">
                    {t('participants.scoliaId')}
                  </Label>
                  <Input
                    type="text"
                    name="scolia_id"
                    value={manualFormData.scolia_id}
                    onChange={handleManualFormChange}
                    className="w-full"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <Label className="block mb-2 text-foreground">
                    {t('participants.email')}
                  </Label>
                  <Input
                    type="email"
                    name="email"
                    value={manualFormData.email}
                    onChange={handleManualFormChange}
                    className="w-full"
                  />
                </div>
                <div>
                  <Label className="block mb-2 text-foreground">
                    {t('participants.nickname')}
                  </Label>
                  <Input
                    type="text"
                    name="nickname"
                    value={manualFormData.nickname}
                    onChange={handleManualFormChange}
                    className="w-full"
                  />
                </div>
              </div>
              
              <div className="flex gap-4 mt-4">
                <Button
                  type="submit"
                  variant="info"
                  disabled={adding}
                >
                  {adding ? t('tournament.participants.adding') : t('tournament.participants.addTitle')}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowManualForm(false);
                    setManualFormData({
                      first_name: '',
                      last_name: '',
                      club: '',
                      scolia_id: '',
                      email: '',
                      nickname: ''
                    });
                  }}
                  disabled={adding}
                >
                  {t('common.cancel')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {seedingApplies && (
        <Card className="mb-8 border border-border bg-card">
          <CardContent className="pt-6">
            <h3 className="m-0 text-lg font-semibold text-foreground">{t('tournament.participants.seedingTitle')}</h3>
            <p className="mt-2 mb-0 text-sm text-muted-foreground">{t('tournament.participants.seedingHint')}</p>
            {tournamentParticipants.length === 0 && (
              <p className="mt-2 mb-0 text-sm text-muted-foreground">{t('tournament.participants.seedingNoParticipants')}</p>
            )}
            {tournamentParticipants.length > 0 && canEdit && (
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {groupsExist && (
                  <p className="m-0 text-sm text-amber-600 dark:text-amber-500">{t('tournament.participants.seedingGroupsLocked')}</p>
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
          </CardContent>
        </Card>
      )}

      {tournamentParticipants.length === 0 ? (
        <p className="text-muted-foreground">{t('tournament.participants.noParticipants')}</p>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-border bg-muted">
                {seedingApplies && (
                  <th className="p-3 text-left text-foreground font-semibold w-[100px]">
                    {t('tournament.participants.seedingColumn')}
                  </th>
                )}
                <th className="p-3 text-left text-foreground font-semibold">{t('common.name')}</th>
                <th className="p-3 text-left text-foreground font-semibold">{t('participants.club')}</th>
                <th className="p-3 text-left text-foreground font-semibold">{t('participants.scoliaId')}</th>
                <th className="p-3 text-right text-foreground font-semibold">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {tournamentParticipants.map(participant => (
                <tr 
                  key={participant.id} 
                  className="border-b border-border bg-card"
                >
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
                  <td className="p-3 font-bold text-foreground">
                    {participant.first_name} {participant.last_name}
                  </td>
                  <td className="p-3 text-muted-foreground">{participant.club || '-'}</td>
                  <td className="p-3 text-muted-foreground">{participant.scolia_id || '-'}</td>
                  <td className="p-3 text-right">
                    {canEdit && (
                      <Button
                        variant="danger"
                        onClick={() => handleRemoveParticipant(participant.id)}
                        size="sm"
                        className="px-3 py-1 text-sm"
                      >
                        {t('common.remove')}
                      </Button>
                    )}
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
