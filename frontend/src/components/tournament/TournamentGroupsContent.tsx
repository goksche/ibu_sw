// Tournament Groups Content (for Tab)
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { tournamentService } from '../../services/tournamentService';
import { locationService } from '../../services/locationService';
import { participantService } from '../../services/participantService';
import { groupService, GroupWithParticipants } from '../../services/groupService';
import { Tournament, Participant, Spielfeld } from '../../types';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { Input } from '../ui/Input';
import { Label } from '../ui/label';
import { useNavigate } from 'react-router-dom';

interface TournamentGroupsContentProps {
  tournamentId: number;
  tournament: Tournament;
}

export default function TournamentGroupsContent({ tournamentId, tournament }: TournamentGroupsContentProps) {
  const { t } = useTranslation();
  const { canEdit } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<GroupWithParticipants[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAddParticipantForm, setShowAddParticipantForm] = useState<number | null>(null);

  const [formData, setFormData] = useState({ name: '' });
  const [selectedParticipantId, setSelectedParticipantId] = useState<string>('');
  const [generating, setGenerating] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_generateResult, setGenerateResult] = useState<{message: string, groups_processed?: number, matches_created?: number, groups_created?: number, participants_assigned?: number, distribution_method?: string} | null>(null);
  /** Sortiert wie am Spielort (sort_order, id) – nicht über Object.entries (sonst wirkt die Reihenfolge „zufällig“). */
  const [spielfelderOptions, setSpielfelderOptions] = useState<Spielfeld[]>([]);

  useEffect(() => {
    loadData();
  }, [tournamentId, tournament.groups_count, tournament.group_distribution, tournament.has_group_phase]);

  useEffect(() => {
    if (!tournament.location_id) {
      setSpielfelderOptions([]);
      return;
    }
    const loadLocations = async () => {
      try {
        const locations = await locationService.getAll();
        const loc = locations.find(l => l.id === tournament.location_id);
        if (loc?.spielfelder?.length) {
          const sorted = [...loc.spielfelder].sort((a, b) => {
            if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
            return a.id - b.id;
          });
          setSpielfelderOptions(sorted);
        } else {
          setSpielfelderOptions([]);
        }
      } catch {
        setSpielfelderOptions([]);
      }
    };
    loadLocations();
  }, [tournament.location_id]);

  const loadData = async () => {
    setLoading(true);
    try {
      let groupsData: GroupWithParticipants[] = [];
      try {
        const baseGroups = await groupService.getGroups(tournamentId);
        try {
          groupsData = await Promise.all(
            baseGroups.map(async (g) => await groupService.getGroup(g.id))
          );
        } catch (err) {
          console.error('Failed to load group details:', err);
          groupsData = baseGroups as unknown as GroupWithParticipants[];
        }
      } catch (err) {
        console.error('Failed to load groups:', err);
        groupsData = [];
      }
      setGroups(groupsData);

      try {
        const participantsData = await participantService.getAll();
        setParticipants(participantsData);
      } catch (err) {
        console.error('Failed to load participants:', err);
        setParticipants([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await groupService.createGroup({ tournament_id: tournamentId, name: formData.name });
      setShowCreateForm(false);
      setFormData({ name: '' });
      loadData();
    } catch (err) {
      console.error('Failed to create group:', err);
      alert('Fehler beim Erstellen der Gruppe');
    }
  };

  const handleAddParticipant = async (groupId: number) => {
    if (!selectedParticipantId) return;

    try {
      await groupService.addParticipant(groupId, { participant_id: parseInt(selectedParticipantId) });
      setShowAddParticipantForm(null);
      setSelectedParticipantId('');
      loadData();
    } catch (err) {
      console.error('Failed to add participant:', err);
      alert('Fehler beim Hinzufügen des Teilnehmers');
    }
  };

  const handleRemoveParticipant = async (groupId: number, participantId: number) => {
    if (!confirm('Möchten Sie diesen Teilnehmer aus der Gruppe entfernen?')) return;

    try {
      await groupService.removeParticipant(groupId, participantId);
      loadData();
    } catch (err) {
      console.error('Failed to remove participant:', err);
      alert('Fehler beim Entfernen des Teilnehmers');
    }
  };

  const handleDeleteGroup = async (groupId: number) => {
    if (!confirm('Möchten Sie diese Gruppe wirklich löschen?')) return;

    try {
      await groupService.deleteGroup(groupId);
      loadData();
    } catch (err) {
      console.error('Failed to delete group:', err);
      alert('Fehler beim Löschen der Gruppe');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleGenerateGroups = async () => {
    if (!confirm('Möchten Sie wirklich die Gruppen neu generieren? Bestehende Gruppen und Spiele werden dabei gelöscht.')) {
      return;
    }

    setGenerating(true);
    setGenerateResult(null);

    try {
      const result = await tournamentService.generateGroups(tournamentId);
      setGenerateResult(result);
      alert(`Gruppen erfolgreich generiert!\nGruppen: ${result.groups_created}\nTeilnehmer: ${result.participants_assigned}\nMethode: ${result.distribution_method}`);
      loadData();
    } catch (err: any) {
      console.error('Failed to generate groups:', err);
      alert(err.response?.data?.detail || 'Fehler beim Generieren der Gruppen');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateRoundRobin = async () => {
    if (!confirm('Möchten Sie wirklich alle Spiele für dieses Turnier generieren? Bestehende Spiele werden dabei überschrieben.')) {
      return;
    }

    setGenerating(true);
    setGenerateResult(null);

    try {
      const result = await tournamentService.generateRoundRobin(tournamentId);
      setGenerateResult(result);
      alert(`Round Robin erfolgreich generiert!\nGruppen: ${result.groups_processed}\nSpiele: ${result.matches_created}`);
    } catch (err: any) {
      console.error('Failed to generate round robin:', err);
      alert(err.response?.data?.detail || 'Fehler beim Generieren der Spiele');
    } finally {
      setGenerating(false);
    }
  };

  const spielfeldModeNorm = (tournament.spielfeld_assignment_mode || '').trim().toLowerCase();
  const isSpielfeldGroupFixed = spielfeldModeNorm === 'group_fixed';

  const groupPhaseEnabled =
    tournament.has_group_phase || tournament.mode === 'round_robin' || tournament.mode === 'combined';

  const showSeedingHint =
    groupPhaseEnabled &&
    (tournament.groups_count ?? 0) > 1 &&
    tournament.group_distribution === 'seeded';

  const assignedParticipantIds = new Set<number>();
  groups.forEach((group) => {
    group.participants?.forEach((participant) => {
      assignedParticipantIds.add(participant.id);
    });
  });

  const availableParticipants = participants.filter((participant) => !assignedParticipantIds.has(participant.id));

  const handleGroupSpielfeldChange = async (groupId: number, spielfeldId: number | null) => {
    if (!canEdit) return;
    try {
      await groupService.updateGroup(groupId, { spielfeld_id: spielfeldId });
      await loadData();
    } catch (err) {
      console.error('Failed to update group spielfeld:', err);
      alert('Fehler beim Speichern des Spielfelds');
    }
  };

  if (loading) return <div className="text-muted-foreground">Wird geladen...</div>;

  return (
    <div>
      {!groupPhaseEnabled && (
        <div className="p-4 bg-warning/20 border border-warning rounded-lg mb-8 text-warning">
          ⚠️ Dieses Turnier hat keine Gruppenphase konfiguriert.
        </div>
      )}

      {showSeedingHint && (
        <Card className="mb-8 border border-border bg-muted/40">
          <CardContent className="p-4">
            <p className="m-0 text-sm text-muted-foreground">{t('tournament.groups.seedingHint')}</p>
            <Button
              type="button"
              variant="outline"
              className="mt-3"
              onClick={() => navigate(`/tournaments/${tournamentId}/participants`)}
            >
              {t('tournament.groups.openParticipants')}
            </Button>
          </CardContent>
        </Card>
      )}

      {showCreateForm && (
        <Card className="mb-8">
          <CardContent className="p-6">
            <h3 className="text-foreground mt-0 font-semibold">Neue Gruppe erstellen</h3>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <Label className="block mb-2 font-bold text-foreground">
                  Gruppennamen *
                </Label>
                <Input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="z.B. Gruppe A"
                  className="w-full"
                />
              </div>
              <div className="flex gap-4">
                <Button type="submit" variant="primary">
                  Erstellen
                </Button>
                <Button
                  type="button"
                  onClick={() => { setShowCreateForm(false); setFormData({ name: '' }); }}
                  variant="secondary"
                >
                  Abbrechen
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between items-center mb-8">
        <h2 className="text-foreground">Gruppen ({groups.length})</h2>
        {canEdit && (
          <div className="flex gap-2 flex-wrap">
            {!showCreateForm && groupPhaseEnabled && (
              <Button 
                onClick={handleGenerateGroups}
                disabled={generating}
                variant="warning"
              >
                {generating ? '⏳ Generiere...' : '🎲 Gruppen generieren'}
              </Button>
            )}
            {!showCreateForm && groupPhaseEnabled && groups.length > 0 && (
              <Button 
                onClick={handleGenerateRoundRobin}
                disabled={generating}
                variant="info"
              >
                {generating ? '⏳ Generiere...' : '⚽ Spielplan generieren'}
              </Button>
            )}
            {!showCreateForm && groupPhaseEnabled && (
              <Button 
                onClick={() => setShowCreateForm(true)}
                variant="success"
              >
                + Neue Gruppe
              </Button>
            )}
          </div>
        )}
      </div>

      {groups.length === 0 ? (
        <p className="text-muted-foreground">Noch keine Gruppen vorhanden.</p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(400px,1fr))] gap-6">
          {groups.map((group) => (
            <Card key={group.id} className="overflow-hidden">
              <div className="bg-primary text-primary-foreground p-4 font-bold flex justify-between items-center">
                <span>{group.name}</span>
                {canEdit && (
                  <Button
                    onClick={() => handleDeleteGroup(group.id)}
                    variant="danger"
                    size="sm"
                    className="px-2 py-1 text-sm"
                  >
                    Löschen
                  </Button>
                )}
              </div>

              <CardContent className="p-4">
                {isSpielfeldGroupFixed && (
                  <div className="mb-4">
                    <Label className="block mb-1.5 text-sm text-muted-foreground">
                      Spielfeld (Gruppe)
                    </Label>
                    {spielfelderOptions.length > 0 ? (
                      <select
                        value={group.spielfeld_id != null ? String(group.spielfeld_id) : ''}
                        disabled={!canEdit}
                        title={canEdit ? undefined : t('tournament.groups.spielfeldReadonlyHint')}
                        onChange={(e) => handleGroupSpielfeldChange(
                          group.id,
                          e.target.value === '' ? null : Number(e.target.value)
                        )}
                        className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <option value="">– Kein Spielfeld –</option>
                        {spielfelderOptions.map((sf) => (
                          <option key={sf.id} value={String(sf.id)}>
                            {sf.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="text-muted-foreground text-sm">
                        Keine Spielfelder verfügbar (Location fehlt oder hat keine Spielfelder)
                      </div>
                    )}
                  </div>
                )}
                <h3 className="mb-2 text-sm text-muted-foreground">
                  Teilnehmer ({group.participants.length})
                </h3>

                {group.participants.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Keine Teilnehmer</p>
                ) : (
                  <ul className="list-none p-0 m-0 mb-4">
                    {group.participants.map((participant) => (
                      <li key={participant.id} className="flex justify-between items-center p-2 bg-muted mb-2 rounded-lg border border-border">
                        <span className="text-foreground">{participant.first_name} {participant.last_name}</span>
                        <Button
                          onClick={() => handleRemoveParticipant(group.id, participant.id)}
                          variant="danger"
                          size="sm"
                          className="px-2 py-1 text-xs"
                        >
                          ✕
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}

                {showAddParticipantForm === group.id ? (
                  <div className="p-3 bg-warning/20 rounded-lg border border-warning">
                    <select
                      value={selectedParticipantId}
                      onChange={(e) => setSelectedParticipantId(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-foreground mb-2"
                    >
                      <option value="">Teilnehmer auswählen...</option>
                      {availableParticipants.length === 0 ? (
                        <option value="" disabled>Keine verfügbaren Teilnehmer</option>
                      ) : (
                        availableParticipants.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.first_name} {p.last_name}
                          </option>
                        ))
                      )}
                    </select>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleAddParticipant(group.id)}
                        disabled={!selectedParticipantId}
                        variant="success"
                        className="flex-1 p-2"
                      >
                        Hinzufügen
                      </Button>
                      <Button
                        onClick={() => { setShowAddParticipantForm(null); setSelectedParticipantId(''); }}
                        variant="secondary"
                        className="flex-1 p-2"
                      >
                        Abbrechen
                      </Button>
                    </div>
                  </div>
                ) : canEdit ? (
                  <Button
                    onClick={() => setShowAddParticipantForm(group.id)}
                    variant="info"
                    className="w-full p-2 text-sm"
                  >
                    + Teilnehmer hinzufügen
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
