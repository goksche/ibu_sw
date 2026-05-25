// Tournament Participants Content (for Tab)
import { useState, useEffect } from 'react';
import { participantService } from '../../services/participantService';
import { Participant } from '../../types';

interface TournamentParticipantsContentProps {
  tournamentId: number;
}

export default function TournamentParticipantsContent({ tournamentId }: TournamentParticipantsContentProps) {
  const [allParticipants, setAllParticipants] = useState<Participant[]>([]);
  const [tournamentParticipants, setTournamentParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<number[]>([]);
  const [adding, setAdding] = useState(false);
  const [manualFormData, setManualFormData] = useState({
    first_name: '',
    last_name: '',
    club: '',
    scolia_id: '',
    email: '',
    nickname: ''
  });

  useEffect(() => {
    loadData();
  }, [tournamentId]);

  const loadData = async () => {
    try {
      const [allParticipantsData, tournamentParticipantsData] = await Promise.all([
        participantService.getAll(),
        participantService.getTournamentParticipants(tournamentId),
      ]);
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

  const handleManualFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setManualFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddManualParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!manualFormData.first_name.trim() || !manualFormData.last_name.trim()) {
      alert('Bitte geben Sie mindestens Vor- und Nachname ein.');
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
      alert(err.response?.data?.detail || 'Fehler beim Hinzufügen des Teilnehmers');
    } finally {
      setAdding(false);
    }
  };

  if (loading) return <div>Wird geladen...</div>;

  // Get participants that are not yet in the tournament
  const availableParticipants = allParticipants.filter(
    p => !tournamentParticipants.some(tp => tp.id === p.id)
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>Turnier-Teilnehmer ({tournamentParticipants.length})</h2>
        {!showAddForm && !showManualForm && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              onClick={() => setShowAddForm(true)}
              style={{ padding: '0.5rem 1rem', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              + Aus Liste hinzufügen
            </button>
            <button 
              onClick={() => setShowManualForm(true)}
              style={{ padding: '0.5rem 1rem', background: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              + Manuell eintragen
            </button>
          </div>
        )}
      </div>

      {showAddForm && (
        <div style={{ marginBottom: '2rem', padding: '1.5rem', background: '#e7f3ff', border: '1px solid #86cfff', borderRadius: '8px' }}>
          <h3>Teilnehmer hinzufügen</h3>
          
          {availableParticipants.length === 0 ? (
            <p>Alle Teilnehmer sind bereits für dieses Turnier registriert.</p>
          ) : (
            <>
              <p style={{ marginBottom: '1rem', color: '#666' }}>
                Wählen Sie Teilnehmer aus ({selectedParticipantIds.length} ausgewählt):
              </p>
              
              <div style={{ maxHeight: '300px', overflowY: 'auto', background: 'white', border: '1px solid #ddd', borderRadius: '4px', padding: '1rem' }}>
                {availableParticipants.map(participant => (
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

      {showManualForm && (
        <div style={{ marginBottom: '2rem', padding: '1.5rem', background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '8px' }}>
          <h3>Teilnehmer manuell eintragen</h3>
          <p style={{ marginBottom: '1rem', color: '#666', fontSize: '0.9rem' }}>
            Geben Sie die Daten des Teilnehmers ein. Dieser wird nur für dieses Turnier erstellt.
          </p>
          
          <form onSubmit={handleAddManualParticipant}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Vorname *
                </label>
                <input
                  type="text"
                  name="first_name"
                  value={manualFormData.first_name}
                  onChange={handleManualFormChange}
                  required
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Nachname *
                </label>
                <input
                  type="text"
                  name="last_name"
                  value={manualFormData.last_name}
                  onChange={handleManualFormChange}
                  required
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                  Verein
                </label>
                <input
                  type="text"
                  name="club"
                  value={manualFormData.club}
                  onChange={handleManualFormChange}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                  Scolia ID
                </label>
                <input
                  type="text"
                  name="scolia_id"
                  value={manualFormData.scolia_id}
                  onChange={handleManualFormChange}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                  E-Mail
                </label>
                <input
                  type="email"
                  name="email"
                  value={manualFormData.email}
                  onChange={handleManualFormChange}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                  Spitzname
                </label>
                <input
                  type="text"
                  name="nickname"
                  value={manualFormData.nickname}
                  onChange={handleManualFormChange}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button
                type="submit"
                disabled={adding}
                style={{
                  padding: '0.75rem 2rem',
                  fontSize: '1rem',
                  background: adding ? '#6c757d' : '#17a2b8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: adding ? 'not-allowed' : 'pointer'
                }}
              >
                {adding ? 'Hinzufügen...' : 'Teilnehmer hinzufügen'}
              </button>
              <button
                type="button"
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
                style={{
                  padding: '0.75rem 2rem',
                  fontSize: '1rem',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: adding ? 'not-allowed' : 'pointer'
                }}
              >
                Abbrechen
              </button>
            </div>
          </form>
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

