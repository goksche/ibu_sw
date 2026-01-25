import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Input, Textarea } from '../components/ui';
import { theme } from '../theme/theme';
import { ArrowLeft } from 'phosphor-react';
import { participantService } from '../services/participantService';
import { tournamentService } from '../services/tournamentService';
import { leagueService } from '../services/leagueService';
import { Participant, Tournament } from '../types';

export default function CreateLeague() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    winPoints: 3,
    drawPoints: 1,
    lossPoints: 0,
    modePresetMode: '',
    modePresetGroupsCount: '',
    modePresetKoStartRound: '',
    participantIds: [] as number[],
    tournamentIds: [] as number[],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [participantList, tournamentList] = await Promise.all([
        participantService.getAll(),
        tournamentService.getAll(),
      ]);
      setParticipants(participantList);
      setTournaments(tournamentList);
    } catch (err) {
      console.warn('Daten konnten nicht geladen werden.', err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const toggleIdInList = (id: number, key: 'participantIds' | 'tournamentIds') => {
    setFormData(prev => {
      const existing = prev[key];
      return {
        ...prev,
        [key]: existing.includes(id) ? existing.filter(item => item !== id) : [...existing, id],
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const modePresets: Record<string, any> = {};
    if (formData.modePresetMode.trim()) {
      modePresets.mode = formData.modePresetMode.trim();
    }
    if (formData.modePresetGroupsCount !== '') {
      const groupsCount = Number(formData.modePresetGroupsCount);
      if (!Number.isNaN(groupsCount) && groupsCount > 0) {
        modePresets.groups_count = groupsCount;
      }
    }
    if (formData.modePresetKoStartRound.trim()) {
      modePresets.ko_start_round = formData.modePresetKoStartRound.trim();
    }
    const modePresetsPayload = Object.keys(modePresets).length > 0 ? modePresets : null;

    try {
      const league = await leagueService.create({
        name: formData.name,
        description: formData.description || null,
        scoring_schema: {
          win: Number(formData.winPoints),
          draw: Number(formData.drawPoints),
          loss: Number(formData.lossPoints),
        },
        mode_presets: modePresetsPayload,
        participant_ids: formData.participantIds,
        tournament_ids: formData.tournamentIds,
      });
      navigate(`/leagues/${league.id}`);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Fehler beim Erstellen der Meisterschaft');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', background: '#000000', minHeight: '100vh', color: '#ffffff' }}>
      <Button variant="secondary" onClick={() => navigate('/leagues')}>
        <ArrowLeft size={18} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
        Zurück
      </Button>

      <h1 style={{ color: '#ffd700', margin: '1.5rem 0' }}>Neue Meisterschaft anlegen</h1>

      <form onSubmit={handleSubmit}>
        <Card style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ marginTop: 0 }}>Basisdaten</h3>
          <Input
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Name der Meisterschaft"
            required
            style={{ marginBottom: '1rem' }}
          />
          <Textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Beschreibung (optional)"
            rows={3}
          />
        </Card>

        <Card style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ marginTop: 0 }}>Punkteschema</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
            <Input
              type="number"
              name="winPoints"
              value={formData.winPoints}
              onChange={handleChange}
              placeholder="Sieg"
            />
            <Input
              type="number"
              name="drawPoints"
              value={formData.drawPoints}
              onChange={handleChange}
              placeholder="Unentschieden"
            />
            <Input
              type="number"
              name="lossPoints"
              value={formData.lossPoints}
              onChange={handleChange}
              placeholder="Niederlage"
            />
          </div>
        </Card>

        <Card style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ marginTop: 0 }}>Modus-Vorgaben</h3>
          <p style={{ marginTop: '0.25rem', color: '#888888', fontSize: '0.85rem' }}>
            Optional. Diese Einstellungen können später als Vorlage für neue Turniere genutzt werden.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Turniermodus</label>
              <select
                name="modePresetMode"
                value={formData.modePresetMode}
                onChange={handleChange}
                style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', border: `1px solid ${theme.colors.border.standard}`, borderRadius: '4px' }}
              >
                <option value="">-- Keine Vorgabe --</option>
                <option value="round_robin">Gruppenphase (Round Robin)</option>
                <option value="knockout">KO‑Turnier</option>
                <option value="combined">Gruppenphase + KO</option>
              </select>
            </div>
            {(formData.modePresetMode === 'round_robin' || formData.modePresetMode === 'combined' || formData.modePresetMode === '') && (
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Gruppenanzahl</label>
                <Input
                  type="number"
                  name="modePresetGroupsCount"
                  value={formData.modePresetGroupsCount}
                  onChange={handleChange}
                  min={1}
                  placeholder="z. B. 4"
                />
              </div>
            )}
            {(formData.modePresetMode === 'combined' || formData.modePresetMode === '') && (
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>KO‑Start‑Runde</label>
                <select
                  name="modePresetKoStartRound"
                  value={formData.modePresetKoStartRound}
                  onChange={handleChange}
                  style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', border: `1px solid ${theme.colors.border.standard}`, borderRadius: '4px' }}
                >
                  <option value="">-- Keine Vorgabe --</option>
                  <option value="round_of_32">Sechzehntelfinale (32)</option>
                  <option value="round_of_16">Achtelfinale (16)</option>
                  <option value="quarterfinal">Viertelfinale (8)</option>
                  <option value="semifinal">Halbfinale (4)</option>
                  <option value="final">Finale (2)</option>
                </select>
              </div>
            )}
          </div>
        </Card>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
          <Card style={{ padding: '1.5rem' }}>
            <h3 style={{ marginTop: 0 }}>Teilnehmer</h3>
            {participants.length === 0 ? (
              <span style={{ color: '#888888' }}>Keine Teilnehmer vorhanden.</span>
            ) : (
              <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
                {participants.map(participant => (
                  <label key={participant.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <input
                      type="checkbox"
                      checked={formData.participantIds.includes(participant.id)}
                      onChange={() => toggleIdInList(participant.id, 'participantIds')}
                    />
                    {participant.first_name} {participant.last_name}
                  </label>
                ))}
              </div>
            )}
          </Card>
          <Card style={{ padding: '1.5rem' }}>
            <h3 style={{ marginTop: 0 }}>Turniere (werden angerechnet)</h3>
            {tournaments.length === 0 ? (
              <span style={{ color: '#888888' }}>Keine Turniere vorhanden.</span>
            ) : (
              <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
                {tournaments.map(tournament => (
                  <label key={tournament.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <input
                      type="checkbox"
                      checked={formData.tournamentIds.includes(tournament.id)}
                      onChange={() => toggleIdInList(tournament.id, 'tournamentIds')}
                    />
                    {tournament.name}
                  </label>
                ))}
              </div>
            )}
          </Card>
        </div>

        {error && <div style={{ color: theme.colors.accent.error, marginTop: '1rem' }}>{error}</div>}

        <div style={{ marginTop: '1.5rem' }}>
          <Button type="submit" disabled={loading}>
            {loading ? 'Speichern...' : 'Meisterschaft erstellen'}
          </Button>
        </div>
      </form>
    </div>
  );
}
