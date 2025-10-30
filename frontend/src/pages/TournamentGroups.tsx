// Tournament Groups Page
import { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { tournamentService } from '../services/tournamentService';
import { participantService } from '../services/participantService';
import { groupService, GroupWithParticipants } from '../services/groupService';
import { Tournament, Participant } from '../types';
import { useNavigate, useParams } from 'react-router-dom';

export default function TournamentGroups() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const tournamentId = id ? parseInt(id) : 0;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [groups, setGroups] = useState<GroupWithParticipants[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAddParticipantForm, setShowAddParticipantForm] = useState<number | null>(null);

  const [formData, setFormData] = useState({ name: '' });
  const [selectedParticipantId, setSelectedParticipantId] = useState<string>('');

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
      const [tournamentData, groupsData, participantsData] = await Promise.all([
        tournamentService.getById(tournamentId),
        groupService.getGroups(tournamentId),
        participantService.getAll(),
      ]);
      setTournament(tournamentData);
      setGroups(groupsData.map(async (g) => await groupService.getGroup(g.id)));
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

  if (loading) return <div style={{ padding: '2rem' }}>Wird geladen...</div>;
  if (!tournament) return <div style={{ padding: '2rem' }}>Turnier nicht gefunden.</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <h1>{tournament.name}</h1>
          <p style={{ color: '#666', marginTop: '0.5rem' }}>Gruppenverwaltung</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            onClick={() => navigate(`/tournaments/${tournamentId}/matches`)}
            style={{ padding: '0.5rem 1rem', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Spiele
          </button>
          <button 
            onClick={() => navigate('/dashboard')}
            style={{ padding: '0.5rem 1rem', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Zurück
          </button>
        </div>
      </div>

      {!tournament.has_group_phase && (
        <div style={{ padding: '1rem', background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '4px', marginBottom: '2rem' }}>
          ⚠️ Dieses Turnier hat keine Gruppenphase konfiguriert.
        </div>
      )}

      {showCreateForm && (
        <div style={{ marginBottom: '2rem', padding: '1.5rem', background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '8px' }}>
          <h2>Neue Gruppe erstellen</h2>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Gruppennamen *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="z.B. Gruppe A"
                style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                type="submit"
                style={{ padding: '0.75rem 2rem', fontSize: '1rem', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Erstellen
              </button>
              <button
                type="button"
                onClick={() => { setShowCreateForm(false); setFormData({ name: '' }); }}
                style={{ padding: '0.75rem 2rem', fontSize: '1rem', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Abbrechen
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>Gruppen ({groups.length})</h2>
        {!showCreateForm && tournament.has_group_phase && (
          <button 
            onClick={() => setShowCreateForm(true)}
            style={{ padding: '0.5rem 1rem', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            + Neue Gruppe
          </button>
        )}
      </div>

      {groups.length === 0 ? (
        <p>Noch keine Gruppen vorhanden.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '1.5rem' }}>
          {groups.map((group) => (
            <div key={group.id} style={{ border: '1px solid #dee2e6', borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{ background: '#007bff', color: 'white', padding: '1rem', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{group.name}</span>
                <button
                  onClick={() => handleDeleteGroup(group.id)}
                  style={{ padding: '0.25rem 0.5rem', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem' }}
                >
                  Löschen
                </button>
              </div>

              <div style={{ padding: '1rem' }}>
                <h3 style={{ marginBottom: '0.5rem', fontSize: '0.875rem', color: '#666' }}>
                  Teilnehmer ({group.participants.length})
                </h3>

                {group.participants.length === 0 ? (
                  <p style={{ color: '#999', fontSize: '0.875rem' }}>Keine Teilnehmer</p>
                ) : (
                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1rem 0' }}>
                    {group.participants.map((participant) => (
                      <li key={participant.id} style={{ padding: '0.5rem', background: '#f8f9fa', marginBottom: '0.5rem', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{participant.first_name} {participant.last_name}</span>
                        <button
                          onClick={() => handleRemoveParticipant(group.id, participant.id)}
                          style={{ padding: '0.25rem 0.5rem', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {showAddParticipantForm === group.id ? (
                  <div style={{ padding: '0.75rem', background: '#fff3cd', borderRadius: '4px' }}>
                    <select
                      value={selectedParticipantId}
                      onChange={(e) => setSelectedParticipantId(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
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
                      <button
                        onClick={() => handleAddParticipant(group.id)}
                        disabled={!selectedParticipantId}
                        style={{ flex: 1, padding: '0.5rem', background: selectedParticipantId ? '#28a745' : '#ccc', color: 'white', border: 'none', borderRadius: '4px', cursor: selectedParticipantId ? 'pointer' : 'not-allowed' }}
                      >
                        Hinzufügen
                      </button>
                      <button
                        onClick={() => { setShowAddParticipantForm(null); setSelectedParticipantId(''); }}
                        style={{ flex: 1, padding: '0.5rem', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        Abbrechen
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAddParticipantForm(group.id)}
                    style={{ width: '100%', padding: '0.5rem', background: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem' }}
                  >
                    + Teilnehmer hinzufügen
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

