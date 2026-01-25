import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, Input, Textarea } from '../components/ui';
import { theme } from '../theme/theme';
import { ArrowLeft } from 'phosphor-react';
import { participantService } from '../services/participantService';
import { tournamentService } from '../services/tournamentService';
import { leagueService } from '../services/leagueService';
import { Participant, Tournament, League } from '../types';

export default function EditLeague() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [loadingLeague, setLoadingLeague] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [league, setLeague] = useState<League | null>(null);
  const [modePresetBase, setModePresetBase] = useState<Record<string, any>>({});

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
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    try {
      const [leagueData, participantList, tournamentList] = await Promise.all([
        leagueService.getById(Number(id)),
        participantService.getAll(),
        tournamentService.getAll(),
      ]);

      setLeague(leagueData);
      setParticipants(participantList);
      setTournaments(tournamentList);
      setModePresetBase(leagueData.mode_presets || {});
      const presetMode = typeof leagueData.mode_presets?.mode === 'string' ? leagueData.mode_presets.mode : '';
      const presetGroupsCount = leagueData.mode_presets?.groups_count;
      const presetKoStartRound = typeof leagueData.mode_presets?.ko_start_round === 'string'
        ? leagueData.mode_presets.ko_start_round
        : '';

      setFormData({
        name: leagueData.name,
        description: leagueData.description || '',
        winPoints: leagueData.scoring_schema?.win ?? 3,
        drawPoints: leagueData.scoring_schema?.draw ?? 1,
        lossPoints: leagueData.scoring_schema?.loss ?? 0,
        modePresetMode: presetMode,
        modePresetGroupsCount: typeof presetGroupsCount === 'number' ? String(presetGroupsCount) : '',
        modePresetKoStartRound: presetKoStartRound,
        participantIds: leagueData.participant_ids || [],
        tournamentIds: leagueData.tournament_ids || [],
      });
    } catch (err) {
      console.warn('Meisterschaft konnte nicht geladen werden.', err);
    } finally {
      setLoadingLeague(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const toggleIdInList = (idValue: number, key: 'participantIds' | 'tournamentIds') => {
    setFormData(prev => {
      const existing = prev[key];
      return {
        ...prev,
        [key]: existing.includes(idValue) ? existing.filter(item => item !== idValue) : [...existing, idValue],
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setError(null);
    setLoading(true);

    const nextModePresets: Record<string, any> = { ...modePresetBase };
    if (formData.modePresetMode.trim()) {
      nextModePresets.mode = formData.modePresetMode.trim();
    } else {
      delete nextModePresets.mode;
    }
    if (formData.modePresetGroupsCount !== '') {
      const groupsCount = Number(formData.modePresetGroupsCount);
      if (!Number.isNaN(groupsCount) && groupsCount > 0) {
        nextModePresets.groups_count = groupsCount;
      } else {
        delete nextModePresets.groups_count;
      }
    } else {
      delete nextModePresets.groups_count;
    }
    if (formData.modePresetKoStartRound.trim()) {
      nextModePresets.ko_start_round = formData.modePresetKoStartRound.trim();
    } else {
      delete nextModePresets.ko_start_round;
    }
    const modePresetsPayload = Object.keys(nextModePresets).length > 0 ? nextModePresets : null;

    try {
      const updatedLeague = await leagueService.update(Number(id), {
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
      navigate(`/leagues/${updatedLeague.id}`);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Fehler beim Speichern der Meisterschaft');
    } finally {
      setLoading(false);
    }
  };

  if (loadingLeague) {
    return <div style={{ padding: '2rem', color: theme.colors.text.primary }}>Wird geladen...</div>;
  }

  if (!league) {
    return <div style={{ padding: '2rem', color: theme.colors.text.primary }}>Meisterschaft nicht gefunden.</div>;
  }

  return (
    <div style={{ padding: '2rem', background: '#000000', minHeight: '100vh', color: '#ffffff' }}>
      <Button variant="secondary" onClick={() => navigate(`/leagues/${league.id}`)}>
        <ArrowLeft size={18} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
        Zurück
      </Button>

      <h1 style={{ color: '#ffd700', margin: '1.5rem 0' }}>Meisterschaft bearbeiten</h1>

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
            {loading ? 'Speichern...' : 'Änderungen speichern'}
          </Button>
        </div>
      </form>
    </div>
  );
}
