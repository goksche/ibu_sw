// Tournament Participants Page
import { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { tournamentService } from '../services/tournamentService';
import { participantService } from '../services/participantService';
import { Tournament, Participant } from '../types';
import { useNavigate, useParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button, Card, Input } from '@/components/ui';

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
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { detail?: string } } };
      console.error('Failed to add participants:', err);
      alert(errObj.response?.data?.detail || 'Fehler beim Hinzufügen der Teilnehmer');
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
    } catch (err: unknown) {
      console.error('Failed to remove participant:', err);
      alert('Fehler beim Entfernen des Teilnehmers');
    }
  };

  if (loading) return <div className="p-8">Wird geladen...</div>;
  if (!tournament) return <div className="p-8">Turnier nicht gefunden.</div>;

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
    <div className="p-8 max-w-[1400px] mx-auto bg-background min-h-screen text-foreground">
      <div className="flex justify-between mb-8">
        <div>
          <h1>{tournament.name}</h1>
          <p className="text-muted-foreground mt-2">Teilnehmer-Verwaltung</p>
        </div>
        <div className="flex gap-4">
          {tournament.has_group_phase && (
            <Button variant="info" onClick={() => navigate(`/tournaments/${tournamentId}/groups`)}>
              Gruppen
            </Button>
          )}
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            Zurück
          </Button>
        </div>
      </div>

      <div className="flex justify-between items-center mb-8">
        <h2>Turnier-Teilnehmer ({tournamentParticipants.length})</h2>
        {!showAddForm && (
          <Button onClick={() => setShowAddForm(true)}>
            + Teilnehmer hinzufügen
          </Button>
        )}
      </div>

      {showAddForm && (
        <Card className="mb-8 p-6 bg-muted border border-border">
          <h2>Teilnehmer hinzufügen</h2>

          {availableParticipants.length === 0 ? (
            <p>Alle Teilnehmer sind bereits für dieses Turnier registriert.</p>
          ) : (
            <>
              <p className="mb-4 text-muted-foreground">
                Wählen Sie Teilnehmer aus ({selectedParticipantIds.length} ausgewählt):
              </p>

              <div className="mb-4">
                <Input
                  type="text"
                  placeholder="Spieler suchen (Name, Verein, Spitzname)..."
                  value={participantSearch}
                  onChange={(e) => setParticipantSearch(e.target.value)}
                  className="max-w-[400px] mb-2"
                />
                <div className="flex gap-2 items-center flex-wrap">
                  <span className="text-sm text-muted-foreground">Sortierung:</span>
                  <Button
                    type="button"
                    variant={participantSortBy === 'last_name' ? 'info' : 'outline'}
                    size="sm"
                    onClick={() => setParticipantSortBy('last_name')}
                  >
                    Nachname
                  </Button>
                  <Button
                    type="button"
                    variant={participantSortBy === 'first_name' ? 'info' : 'outline'}
                    size="sm"
                    onClick={() => setParticipantSortBy('first_name')}
                  >
                    Vorname
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
                  Alle auswählen
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleClearSelected}
                  disabled={selectedParticipantIds.length === 0}
                >
                  Alle löschen
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

      {tournamentParticipants.length === 0 ? (
        <p>Noch keine Teilnehmer für dieses Turnier registriert.</p>
      ) : (
        <div className="bg-muted border border-border rounded-lg overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-border bg-muted">
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">Verein</th>
                <th className="p-3 text-left">Scolia ID</th>
                <th className="p-3 text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {tournamentParticipants.map(participant => (
                <tr key={participant.id} className="border-b border-border">
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
                      Entfernen
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
