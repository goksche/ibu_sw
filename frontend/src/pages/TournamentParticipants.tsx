// Tournament Participants Page
import { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { tournamentService } from '../services/tournamentService';
import { participantService } from '../services/participantService';
import { Tournament, Participant } from '../types';
import { useNavigate, useParams } from 'react-router-dom';

export default function TournamentParticipants() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const tournamentId = id ? parseInt(id) : 0;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [allParticipants, setAllParticipants] = useState<Participant[]>([]);
  const [tournamentParticipants, setTournamentParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<number[]>([]);
  const [adding, setAdding] = useState(false);
  const [participantSearch, setParticipantSearch] = useState('');
  const [participantSortBy, setParticipantSortBy] = useState<'first_name' | 'last_name'>('last_name');

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
      const [tournamentData, allParticipantsData, tournamentParticipantsData] = await Promise.all([
        tournamentService.getById(tournamentId),
        participantService.getAll(),
        participantService.getTournamentParticipants(tournamentId),
      ]);
      setTournament(tournamentData);
      setAllParticipants(allParticipantsData);
      setTournamentParticipants(tournamentParticipantsData);
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
      alert('Bitte wählen Sie mindestens einen Teilnehmer aus.');
      return;
    }

    setAdding(true);

    try {
      const result = await participantService.addTournamentParticipants(tournamentId, selectedParticipantIds);
      alert(`Teilnehmer hinzugefügt!\nHinzugefügt: ${result.added}\nÜbersprungen: ${result.skipped} (bereits vorhanden)`);
      setShowAddForm(false);
      setSelectedParticipantIds([]);
      loadData();
    } catch (err: any) {
      console.error('Failed to add participants:', err);
      alert(err.response?.data?.detail || 'Fehler beim Hinzufügen der Teilnehmer');
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
    if (!confirm('Möchten Sie diesen Teilnehmer wirklich aus dem Turnier entfernen?')) {
      return;
    }

    try {
      await participantService.removeTournamentParticipant(tournamentId, participantId);
      loadData();
    } catch (err: any) {
      console.error('Failed to remove participant:', err);
      alert('Fehler beim Entfernen des Teilnehmers');
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Wird geladen...</div>;
  if (!tournament) return <div style={{ padding: '2rem' }}>Turnier nicht gefunden.</div>;

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

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <h1>{tournament.name}</h1>
          <p style={{ color: '#666', marginTop: '0.5rem' }}>Teilnehmer-Verwaltung</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {tournament.has_group_phase && (
            <button 
              onClick={() => navigate(`/tournaments/${tournamentId}/groups`)}
              style={{ padding: '0.5rem 1rem', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Gruppen
            </button>
          )}
          <button 
            onClick={() => navigate('/dashboard')}
            style={{ padding: '0.5rem 1rem', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Zurück
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>Turnier-Teilnehmer ({tournamentParticipants.length})</h2>
        {!showAddForm && (
          <button 
            onClick={() => setShowAddForm(true)}
            style={{ padding: '0.5rem 1rem', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            + Teilnehmer hinzufügen
          </button>
        )}
      </div>

      {showAddForm && (
        <div style={{ marginBottom: '2rem', padding: '1.5rem', background: '#e7f3ff', border: '1px solid #86cfff', borderRadius: '8px' }}>
          <h2>Teilnehmer hinzufügen</h2>
          
          {availableParticipants.length === 0 ? (
            <p>Alle Teilnehmer sind bereits für dieses Turnier registriert.</p>
          ) : (
            <>
              <p style={{ marginBottom: '1rem', color: '#666' }}>
                Wählen Sie Teilnehmer aus ({selectedParticipantIds.length} ausgewählt):
              </p>

              <div style={{ marginBottom: '1rem' }}>
                <input
                  type="text"
                  placeholder="Spieler suchen (Name, Verein, Spitzname)..."
                  value={participantSearch}
                  onChange={(e) => setParticipantSearch(e.target.value)}
                  style={{ width: '100%', maxWidth: '400px', padding: '0.5rem 0.75rem', marginBottom: '0.5rem', display: 'block', border: '1px solid #ddd', borderRadius: '4px' }}
                />
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.875rem', color: '#666' }}>Sortierung:</span>
                  <button
                    type="button"
                    onClick={() => setParticipantSortBy('last_name')}
                    style={{
                      padding: '0.35rem 0.6rem', fontSize: '0.85rem',
                      background: participantSortBy === 'last_name' ? '#007bff' : '#6c757d',
                      color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'
                    }}
                  >
                    Nachname
                  </button>
                  <button
                    type="button"
                    onClick={() => setParticipantSortBy('first_name')}
                    style={{
                      padding: '0.35rem 0.6rem', fontSize: '0.85rem',
                      background: participantSortBy === 'first_name' ? '#007bff' : '#6c757d',
                      color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'
                    }}
                  >
                    Vorname
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <button
                  onClick={handleSelectAllAvailable}
                  disabled={availableParticipants.length === 0}
                  style={{
                    padding: '0.4rem 0.75rem',
                    background: availableParticipants.length === 0 ? '#6c757d' : '#17a2b8',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: availableParticipants.length === 0 ? 'not-allowed' : 'pointer'
                  }}
                >
                  Alle auswählen
                </button>
                <button
                  onClick={handleClearSelected}
                  disabled={selectedParticipantIds.length === 0}
                  style={{
                    padding: '0.4rem 0.75rem',
                    background: selectedParticipantIds.length === 0 ? '#6c757d' : '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: selectedParticipantIds.length === 0 ? 'not-allowed' : 'pointer'
                  }}
                >
                  Alle löschen
                </button>
              </div>
              
              <div style={{ maxHeight: '300px', overflowY: 'auto', background: 'white', border: '1px solid #ddd', borderRadius: '4px', padding: '1rem' }}>
                {sortedAvailableParticipants.map(participant => (
                  <label 
                    key={participant.id}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      padding: '0.5rem',
                      cursor: 'pointer',
                      borderBottom: '1px solid #eee'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedParticipantIds.includes(participant.id)}
                      onChange={() => handleToggleParticipant(participant.id)}
                      style={{ marginRight: '0.75rem', cursor: 'pointer' }}
                    />
                    <span>
                      <strong>{participant.first_name} {participant.last_name}</strong>
                      {participant.club && <span style={{ color: '#666', marginLeft: '0.5rem' }}>({participant.club})</span>}
                    </span>
                  </label>
                ))}
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button
                  onClick={handleAddParticipants}
                  disabled={adding || selectedParticipantIds.length === 0}
                  style={{
                    padding: '0.75rem 2rem',
                    fontSize: '1rem',
                    background: adding || selectedParticipantIds.length === 0 ? '#6c757d' : '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: adding || selectedParticipantIds.length === 0 ? 'not-allowed' : 'pointer'
                  }}
                >
                  {adding ? 'Hinzufügen...' : 'Ausgewählte hinzufügen'}
                </button>
                <button
                  onClick={() => { setShowAddForm(false); setSelectedParticipantIds([]); }}
                  style={{
                    padding: '0.75rem 2rem',
                    fontSize: '1rem',
                    background: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Abbrechen
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {tournamentParticipants.length === 0 ? (
        <p>Noch keine Teilnehmer für dieses Turnier registriert.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ddd', background: '#f8f9fa' }}>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Name</th>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Verein</th>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Scolia ID</th>
              <th style={{ padding: '0.75rem', textAlign: 'right' }}>Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {tournamentParticipants.map(participant => (
              <tr key={participant.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>
                  {participant.first_name} {participant.last_name}
                </td>
                <td style={{ padding: '0.75rem' }}>{participant.club || '-'}</td>
                <td style={{ padding: '0.75rem' }}>{participant.scolia_id || '-'}</td>
                <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                  <button
                    onClick={() => handleRemoveParticipant(participant.id)}
                    style={{ padding: '0.25rem 0.75rem', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Entfernen
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

