// Tournament Groups Content (for Tab)
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { tournamentService } from '../../services/tournamentService';
import { locationService } from '../../services/locationService';
import { participantService } from '../../services/participantService';
import { groupService, GroupWithParticipants } from '../../services/groupService';
import { Tournament, Participant } from '../../types';
import { theme } from '../../theme/theme';
import { Button } from '../ui';

interface TournamentGroupsContentProps {
  tournamentId: number;
  tournament: Tournament;
}

export default function TournamentGroupsContent({ tournamentId, tournament }: TournamentGroupsContentProps) {
  const { canEdit } = useAuth();
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
      const [groupsData, participantsData] = await Promise.all([
        groupService.getGroups(tournamentId),
        participantService.getAll(),
      ]);
      const fullGroups = await Promise.all(
        groupsData.map(async (g) => await groupService.getGroup(g.id))
      );
      setGroups(fullGroups);
      setParticipants(participantsData);
    } catch (err) {
      console.error('Failed to load data:', err);
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

  const handleGenerateKOBracket = async () => {
    if (!confirm('Möchten Sie wirklich das KO-Bracket generieren? Bestehende KO-Spiele werden dabei gelöscht.')) {
      return;
    }

    setGenerating(true);
    setGenerateResult(null);

    try {
      const result = await tournamentService.generateKOBracket(tournamentId);
      setGenerateResult(result);
      alert(`KO-Bracket erfolgreich generiert!\nSpiele: ${result.matches_created}\nErste Runde: Top ${result.first_round_size}\nModus: ${result.mode === 'cross' ? 'Cross' : 'Draw'}`);
    } catch (err: any) {
      console.error('Failed to generate KO bracket:', err);
      alert(err.response?.data?.detail || 'Fehler beim Generieren des KO-Brackets');
    } finally {
      setGenerating(false);
    }
  };

  const spielfelderList = tournament.location_id
    ? Object.entries(spielfeldIdToName).map(([id, name]) => ({ id: Number(id), name }))
    : [];

  const handleGroupSpielfeldChange = async (groupId: number, spielfeldId: number | null) => {
    try {
      await groupService.updateGroup(groupId, { spielfeld_id: spielfeldId });
      loadData();
    } catch (err) {
      console.error('Failed to update group spielfeld:', err);
      alert('Fehler beim Speichern des Spielfelds');
    }
  };

  if (loading) return <div style={{ color: theme.colors.text.secondary }}>Wird geladen...</div>;

  return (
    <div>
      {!tournament.has_group_phase && (
        <div style={{ 
          padding: '1rem', 
          background: `${theme.colors.accent.warning}20`, 
          border: `1px solid ${theme.colors.accent.warning}`, 
          borderRadius: theme.borderRadius.card, 
          marginBottom: '2rem',
          color: theme.colors.accent.warning
        }}>
          ⚠️ Dieses Turnier hat keine Gruppenphase konfiguriert.
        </div>
      )}

      {showCreateForm && (
        <div style={{ 
          marginBottom: '2rem', 
          padding: '1.5rem', 
          background: theme.colors.background.card, 
          border: `1px solid ${theme.colors.border.standard}`, 
          borderRadius: theme.borderRadius.card 
        }}>
          <h3 style={{ color: theme.colors.text.primary, marginTop: 0 }}>Neue Gruppe erstellen</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                fontWeight: 'bold',
                color: theme.colors.text.primary
              }}>
                Gruppennamen *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="z.B. Gruppe A"
                style={{ 
                  width: '100%', 
                  padding: '0.5rem', 
                  fontSize: '1rem', 
                  border: `1px solid ${theme.colors.border.standard}`, 
                  borderRadius: theme.borderRadius.input,
                  background: theme.colors.background.secondary,
                  color: theme.colors.text.primary
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
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
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ color: theme.colors.text.primary }}>Gruppen ({groups.length})</h2>
        {canEdit && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {!showCreateForm && tournament.has_group_phase && (
              <Button 
                onClick={handleGenerateGroups}
                disabled={generating}
                variant="warning"
              >
                {generating ? '⏳ Generiere...' : '🎲 Gruppen generieren'}
              </Button>
            )}
            {!showCreateForm && tournament.has_group_phase && groups.length > 0 && (
              <Button 
                onClick={handleGenerateRoundRobin}
                disabled={generating}
                variant="info"
              >
                {generating ? '⏳ Generiere...' : '⚽ Spielplan generieren'}
              </Button>
            )}
            {!showCreateForm && tournament.has_ko_phase && groups.length > 0 && (
              <Button 
                onClick={handleGenerateKOBracket}
                disabled={generating}
                variant="warning"
              >
                {generating ? '⏳ Generiere...' : '🔄 KO-Bracket generieren/neu generieren'}
              </Button>
            )}
            {!showCreateForm && tournament.has_group_phase && (
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
        <p style={{ color: theme.colors.text.secondary }}>Noch keine Gruppen vorhanden.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '1.5rem' }}>
          {groups.map((group) => (
            <div key={group.id} style={{ 
              border: `1px solid ${theme.colors.border.standard}`, 
              borderRadius: theme.borderRadius.card, 
              overflow: 'hidden',
              background: theme.colors.background.card
            }}>
              <div style={{ 
                background: theme.colors.accent.primary, 
                color: theme.colors.background.primary, 
                padding: '1rem', 
                fontWeight: 'bold', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center' 
              }}>
                <span>{group.name}</span>
                {canEdit && (
                  <Button
                    onClick={() => handleDeleteGroup(group.id)}
                    variant="danger"
                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                  >
                    Löschen
                  </Button>
                )}
              </div>

              <div style={{ padding: '1rem' }}>
                {tournament.spielfeld_assignment_mode === 'group_fixed' && (
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '0.35rem', 
                      fontSize: '0.875rem', 
                      color: theme.colors.text.secondary 
                    }}>
                      Spielfeld (Gruppe)
                    </label>
                    {spielfelderList.length > 0 ? (
                      <select
                        value={group.spielfeld_id ?? ''}
                        onChange={(e) => handleGroupSpielfeldChange(
                          group.id,
                          e.target.value === '' ? null : Number(e.target.value)
                        )}
                        style={{ 
                          width: '100%', 
                          padding: '0.5rem', 
                          border: `1px solid ${theme.colors.border.standard}`, 
                          borderRadius: theme.borderRadius.input,
                          background: theme.colors.background.secondary,
                          color: theme.colors.text.primary
                        }}
                      >
                        <option value="">– Kein Spielfeld –</option>
                        {spielfelderList.map((sf) => (
                          <option key={sf.id} value={sf.id}>
                            {sf.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div style={{ color: theme.colors.text.disabled, fontSize: '0.875rem' }}>
                        Keine Spielfelder verfügbar (Location fehlt oder hat keine Spielfelder)
                      </div>
                    )}
                  </div>
                )}
                <h3 style={{ 
                  marginBottom: '0.5rem', 
                  fontSize: '0.875rem', 
                  color: theme.colors.text.secondary 
                }}>
                  Teilnehmer ({group.participants.length})
                </h3>

                {group.participants.length === 0 ? (
                  <p style={{ color: theme.colors.text.disabled, fontSize: '0.875rem' }}>Keine Teilnehmer</p>
                ) : (
                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1rem 0' }}>
                    {group.participants.map((participant) => (
                      <li key={participant.id} style={{ 
                        padding: '0.5rem', 
                        background: theme.colors.background.secondary, 
                        marginBottom: '0.5rem', 
                        borderRadius: theme.borderRadius.card, 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        border: `1px solid ${theme.colors.border.standard}`
                      }}>
                        <span style={{ color: theme.colors.text.primary }}>{participant.first_name} {participant.last_name}</span>
                        <Button
                          onClick={() => handleRemoveParticipant(group.id, participant.id)}
                          variant="danger"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        >
                          ✕
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}

                {showAddParticipantForm === group.id ? (
                  <div style={{ 
                    padding: '0.75rem', 
                    background: `${theme.colors.accent.warning}20`, 
                    borderRadius: theme.borderRadius.card,
                    border: `1px solid ${theme.colors.accent.warning}`
                  }}>
                    <select
                      value={selectedParticipantId}
                      onChange={(e) => setSelectedParticipantId(e.target.value)}
                      style={{ 
                        width: '100%', 
                        padding: '0.5rem', 
                        marginBottom: '0.5rem', 
                        border: `1px solid ${theme.colors.border.standard}`, 
                        borderRadius: theme.borderRadius.input,
                        background: theme.colors.background.secondary,
                        color: theme.colors.text.primary
                      }}
                    >
                      <option value="">Teilnehmer auswählen...</option>
                      {participants
                        .filter(p => !group.participants.some(gp => gp.id === p.id))
                        .map(p => (
                          <option key={p.id} value={p.id}>
                            {p.first_name} {p.last_name}
                          </option>
                        ))
                      }
                    </select>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <Button
                        onClick={() => handleAddParticipant(group.id)}
                        disabled={!selectedParticipantId}
                        variant="success"
                        style={{ flex: 1, padding: '0.5rem' }}
                      >
                        Hinzufügen
                      </Button>
                      <Button
                        onClick={() => { setShowAddParticipantForm(null); setSelectedParticipantId(''); }}
                        variant="secondary"
                        style={{ flex: 1, padding: '0.5rem' }}
                      >
                        Abbrechen
                      </Button>
                    </div>
                  </div>
                ) : canEdit ? (
                  <Button
                    onClick={() => setShowAddParticipantForm(group.id)}
                    variant="info"
                    fullWidth
                    style={{ padding: '0.5rem', fontSize: '0.875rem' }}
                  >
                    + Teilnehmer hinzufügen
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

