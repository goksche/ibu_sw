// Tournament Participants Content (for Tab)
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { participantService } from '../../services/participantService';
import { Participant } from '../../types';
import { cn } from '@/lib/utils';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { Input } from '../ui/Input';
import { Label } from '../ui/label';

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

  if (loading) return <div className="text-foreground">Wird geladen...</div>;

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
        <h2 className="text-foreground">Turnier-Teilnehmer ({tournamentParticipants.length})</h2>
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

      {showAddForm && (
        <Card className="mb-8">
          <CardContent className="pt-6">
            <h3 className="text-foreground mt-0 font-semibold">Teilnehmer hinzufügen</h3>
            
            {availableParticipants.length === 0 ? (
              <p className="text-muted-foreground">Alle Teilnehmer sind bereits für dieses Turnier registriert.</p>
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
                    className="mb-2"
                  />
                  <div className="flex gap-2 items-center flex-wrap">
                    <span className="text-sm text-muted-foreground">Sortierung:</span>
                    <Button
                      variant={participantSortBy === 'last_name' ? 'primary' : 'secondary'}
                      onClick={() => setParticipantSortBy('last_name')}
                      className="py-1.5 px-2.5 text-sm"
                    >
                      Nachname
                    </Button>
                    <Button
                      variant={participantSortBy === 'first_name' ? 'primary' : 'secondary'}
                      onClick={() => setParticipantSortBy('first_name')}
                      className="py-1.5 px-2.5 text-sm"
                    >
                      Vorname
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
                    Alle auswählen
                  </Button>
                  <Button
                    variant="danger"
                    onClick={handleClearSelected}
                    disabled={selectedParticipantIds.length === 0}
                    className="py-1.5 px-3 text-sm"
                  >
                    Alle löschen
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
                    Vorname *
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
                    Nachname *
                  </Label>
                  <Input
                    type="text"
                    name="last_name"
                    value={manualFormData.last_name}
                    onChange={handleManualFormChange}
                    required
                    className="w-full"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <Label className="block mb-2 text-foreground">
                    Verein
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
                    Scolia ID
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
                    E-Mail
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
                    Spitzname
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
          </CardContent>
        </Card>
      )}

      {tournamentParticipants.length === 0 ? (
        <p className="text-muted-foreground">Noch keine Teilnehmer für dieses Turnier registriert.</p>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-border bg-muted">
                <th className="p-3 text-left text-foreground font-semibold">Name</th>
                <th className="p-3 text-left text-foreground font-semibold">Verein</th>
                <th className="p-3 text-left text-foreground font-semibold">Scolia ID</th>
                <th className="p-3 text-right text-foreground font-semibold">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {tournamentParticipants.map(participant => (
                <tr 
                  key={participant.id} 
                  className="border-b border-border bg-card"
                >
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
