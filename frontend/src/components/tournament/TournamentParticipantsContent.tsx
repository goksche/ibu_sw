// Tournament Participants Content (for Tab)
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { participantService } from '../../services/participantService';
import { Participant } from '../../types';
import { theme } from '../../theme/theme';
import { Button, Card, Input } from '../ui';

interface TournamentParticipantsContentProps {
  tournamentId: number;
}

export default function TournamentParticipantsContent({ tournamentId }: TournamentParticipantsContentProps) {
  const { canEdit } = useAuth();
  const [allParticipants, setAllParticipants] = useState<Participant[]>([]);
  const [tournamentParticipants, setTournamentParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<number[]>([]);
  const [adding, setAdding] = useState(false);
  const [participantSearch, setParticipantSearch] = useState('');
  const [participantSortBy, setParticipantSortBy] = useState<'first_name' | 'last_name'>('last_name');
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

  if (loading) return <div style={{ color: theme.colors.text.primary }}>Wird geladen...</div>;

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ color: theme.colors.text.primary }}>Turnier-Teilnehmer ({tournamentParticipants.length})</h2>
        {canEdit && !showAddForm && !showManualForm && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
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

      {showAddForm && (
        <Card style={{ marginBottom: '2rem', background: theme.colors.background.card, border: `1px solid ${theme.colors.border.standard}` }}>
          <h3 style={{ color: theme.colors.text.primary, marginTop: 0 }}>Teilnehmer hinzufügen</h3>
          
          {availableParticipants.length === 0 ? (
            <p style={{ color: theme.colors.text.secondary }}>Alle Teilnehmer sind bereits für dieses Turnier registriert.</p>
          ) : (
            <>
              <p style={{ marginBottom: '1rem', color: theme.colors.text.secondary }}>
                Wählen Sie Teilnehmer aus ({selectedParticipantIds.length} ausgewählt):
              </p>

              <div style={{ marginBottom: '1rem' }}>
                <Input
                  type="text"
                  placeholder="Spieler suchen (Name, Verein, Spitzname)..."
                  value={participantSearch}
                  onChange={(e) => setParticipantSearch(e.target.value)}
                  style={{ marginBottom: '0.5rem' }}
                />
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.875rem', color: theme.colors.text.secondary }}>Sortierung:</span>
                  <Button
                    variant={participantSortBy === 'last_name' ? 'primary' : 'secondary'}
                    onClick={() => setParticipantSortBy('last_name')}
                    style={{ padding: '0.35rem 0.6rem', fontSize: '0.85rem' }}
                  >
                    Nachname
                  </Button>
                  <Button
                    variant={participantSortBy === 'first_name' ? 'primary' : 'secondary'}
                    onClick={() => setParticipantSortBy('first_name')}
                    style={{ padding: '0.35rem 0.6rem', fontSize: '0.85rem' }}
                  >
                    Vorname
                  </Button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <Button
                  variant="info"
                  onClick={handleSelectAllAvailable}
                  disabled={availableParticipants.length === 0}
                  style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                >
                  Alle auswählen
                </Button>
                <Button
                  variant="danger"
                  onClick={handleClearSelected}
                  disabled={selectedParticipantIds.length === 0}
                  style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                >
                  Alle löschen
                </Button>
              </div>
              
              <div style={{ 
                maxHeight: '300px', 
                overflowY: 'auto', 
                background: theme.colors.background.secondary, 
                border: `1px solid ${theme.colors.border.standard}`, 
                borderRadius: theme.borderRadius.card, 
                padding: '1rem' 
              }}>
                {sortedAvailableParticipants.map(participant => (
                  <label 
                    key={participant.id}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      padding: '0.75rem',
                      cursor: 'pointer',
                      borderBottom: `1px solid ${theme.colors.border.standard}`,
                      color: theme.colors.text.primary
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedParticipantIds.includes(participant.id)}
                      onChange={() => handleToggleParticipant(participant.id)}
                      style={{ marginRight: '0.75rem', cursor: 'pointer', width: '16px', height: '16px' }}
                    />
                    <span>
                      <strong>{participant.first_name} {participant.last_name}</strong>
                      {participant.club && <span style={{ color: theme.colors.text.secondary, marginLeft: '0.5rem' }}>({participant.club})</span>}
                    </span>
                  </label>
                ))}
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <Button
                  variant="primary"
                  onClick={handleAddParticipants}
                  disabled={adding || selectedParticipantIds.length === 0}
                >
                  {adding ? 'Hinzufügen...' : 'Ausgewählte hinzufügen'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => { setShowAddForm(false); setSelectedParticipantIds([]); }}
                >
                  Abbrechen
                </Button>
              </div>
            </>
          )}
        </Card>
      )}

      {showManualForm && (
        <Card style={{ marginBottom: '2rem', background: theme.colors.background.card, border: `1px solid ${theme.colors.accent.warning}` }}>
          <h3 style={{ color: theme.colors.text.primary, marginTop: 0 }}>Teilnehmer manuell eintragen</h3>
          <p style={{ marginBottom: '1rem', color: theme.colors.text.secondary, fontSize: '0.9rem' }}>
            Geben Sie die Daten des Teilnehmers ein. Dieser wird nur für dieses Turnier erstellt.
          </p>
          
          <form onSubmit={handleAddManualParticipant}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: theme.colors.text.primary }}>
                  Vorname *
                </label>
                <Input
                  type="text"
                  name="first_name"
                  value={manualFormData.first_name}
                  onChange={handleManualFormChange}
                  required
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: theme.colors.text.primary }}>
                  Nachname *
                </label>
                <Input
                  type="text"
                  name="last_name"
                  value={manualFormData.last_name}
                  onChange={handleManualFormChange}
                  required
                  style={{ width: '100%' }}
                />
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: theme.colors.text.primary }}>
                  Verein
                </label>
                <Input
                  type="text"
                  name="club"
                  value={manualFormData.club}
                  onChange={handleManualFormChange}
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: theme.colors.text.primary }}>
                  Scolia ID
                </label>
                <Input
                  type="text"
                  name="scolia_id"
                  value={manualFormData.scolia_id}
                  onChange={handleManualFormChange}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: theme.colors.text.primary }}>
                  E-Mail
                </label>
                <Input
                  type="email"
                  name="email"
                  value={manualFormData.email}
                  onChange={handleManualFormChange}
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: theme.colors.text.primary }}>
                  Spitzname
                </label>
                <Input
                  type="text"
                  name="nickname"
                  value={manualFormData.nickname}
                  onChange={handleManualFormChange}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <Button
                type="submit"
                variant="info"
                disabled={adding}
              >
                {adding ? 'Hinzufügen...' : 'Teilnehmer hinzufügen'}
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
                Abbrechen
              </Button>
            </div>
          </form>
        </Card>
      )}

      {tournamentParticipants.length === 0 ? (
        <p style={{ color: theme.colors.text.secondary }}>Noch keine Teilnehmer für dieses Turnier registriert.</p>
      ) : (
        <div style={{
          background: theme.colors.background.card,
          border: `1px solid ${theme.colors.border.standard}`,
          borderRadius: theme.borderRadius.card,
          overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ 
                borderBottom: `2px solid ${theme.colors.border.standard}`, 
                background: theme.colors.background.secondary 
              }}>
                <th style={{ padding: '0.75rem', textAlign: 'left', color: theme.colors.text.primary, fontWeight: '600' }}>Name</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', color: theme.colors.text.primary, fontWeight: '600' }}>Verein</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', color: theme.colors.text.primary, fontWeight: '600' }}>Scolia ID</th>
                <th style={{ padding: '0.75rem', textAlign: 'right', color: theme.colors.text.primary, fontWeight: '600' }}>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {tournamentParticipants.map(participant => (
                <tr 
                  key={participant.id} 
                  style={{ 
                    borderBottom: `1px solid ${theme.colors.border.standard}`,
                    background: theme.colors.background.card
                  }}
                >
                  <td style={{ padding: '0.75rem', fontWeight: 'bold', color: theme.colors.text.primary }}>
                    {participant.first_name} {participant.last_name}
                  </td>
                  <td style={{ padding: '0.75rem', color: theme.colors.text.secondary }}>{participant.club || '-'}</td>
                  <td style={{ padding: '0.75rem', color: theme.colors.text.secondary }}>{participant.scolia_id || '-'}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                    {canEdit && (
                      <Button
                        variant="danger"
                        onClick={() => handleRemoveParticipant(participant.id)}
                        style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}
                      >
                        Entfernen
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

