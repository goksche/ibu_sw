import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card } from '../components/ui';
import { leagueService } from '../services/leagueService';
import { League } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { theme } from '../theme/theme';
import { PencilSimple, Trash, ArrowLeft } from 'phosphor-react';

export default function LeagueDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canEdit } = useAuth();
  const [league, setLeague] = useState<League | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadLeague();
  }, [id]);

  const loadLeague = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await leagueService.getById(Number(id));
      setLeague(data);
    } catch (err) {
      console.warn('Meisterschaft konnte nicht geladen werden.', err);
      setLeague(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!league || !canEdit) return;
    const confirmed = window.confirm(`Meisterschaft "${league.name}" wirklich löschen?`);
    if (!confirmed) return;
    setDeleting(true);
    try {
      await leagueService.delete(league.id);
      navigate('/leagues');
    } catch (err) {
      console.warn('Meisterschaft konnte nicht gelöscht werden.', err);
      setDeleting(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', color: theme.colors.text.primary }}>Wird geladen...</div>;
  }

  if (!league) {
    return (
      <div style={{ padding: '2rem', color: theme.colors.text.primary }}>
        Meisterschaft nicht gefunden.
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', background: '#000000', minHeight: '100vh', color: '#ffffff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <Button variant="secondary" onClick={() => navigate('/leagues')}>
          <ArrowLeft size={18} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
          Zurück
        </Button>
        {canEdit && (
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Button variant="secondary" onClick={() => navigate(`/leagues/${league.id}/edit`)}>
              <PencilSimple size={18} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
              Bearbeiten
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              <Trash size={18} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
              Löschen
            </Button>
          </div>
        )}
      </div>

      <Card style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h2 style={{ marginTop: 0, color: '#ffd700' }}>{league.name}</h2>
        {league.description && (
          <p style={{ color: '#cccccc' }}>{league.description}</p>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
          <div>
            <h4 style={{ marginBottom: '0.5rem' }}>Punkteschema</h4>
            {league.scoring_schema ? (
              <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#cccccc' }}>
                {Object.entries(league.scoring_schema).map(([key, value]) => (
                  <li key={key}>{key}: {value}</li>
                ))}
              </ul>
            ) : (
              <span style={{ color: '#888888' }}>Kein Schema hinterlegt</span>
            )}
          </div>
          <div>
            <h4 style={{ marginBottom: '0.5rem' }}>Modus-Vorgaben</h4>
            {league.mode_presets ? (
              <pre style={{ margin: 0, color: '#cccccc', whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(league.mode_presets, null, 2)}
              </pre>
            ) : (
              <span style={{ color: '#888888' }}>Keine Vorgaben</span>
            )}
          </div>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
        <Card style={{ padding: '1.5rem' }}>
          <h3 style={{ marginTop: 0 }}>Teilnehmer</h3>
          {league.participants.length === 0 ? (
            <span style={{ color: '#888888' }}>Keine Teilnehmer zugeordnet</span>
          ) : (
            <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#cccccc' }}>
              {league.participants.map(participant => (
                <li key={participant.id}>{participant.first_name} {participant.last_name}</li>
              ))}
            </ul>
          )}
        </Card>
        <Card style={{ padding: '1.5rem' }}>
          <h3 style={{ marginTop: 0 }}>Turniere</h3>
          {league.tournaments.length === 0 ? (
            <span style={{ color: '#888888' }}>Keine Turniere zugeordnet</span>
          ) : (
            <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#cccccc' }}>
              {league.tournaments.map(tournament => (
                <li key={tournament.id}>{tournament.name}</li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
