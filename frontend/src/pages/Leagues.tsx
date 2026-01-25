import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { leagueService } from '../services/leagueService';
import { League } from '../types';
import { Button, Card, Input } from '../components/ui';
import { theme } from '../theme/theme';
import { Plus, MagnifyingGlass, Trophy } from 'phosphor-react';

export default function Leagues() {
  const navigate = useNavigate();
  const { isAuthenticated, canEdit } = useAuth();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    loadLeagues();
  }, [isAuthenticated, navigate]);

  const loadLeagues = async () => {
    try {
      const data = await leagueService.getAll();
      setLeagues(data);
    } catch (err) {
      console.warn('Meisterschaften konnten nicht geladen werden.', err);
      setLeagues([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredLeagues = leagues.filter(league =>
    !searchTerm || league.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div style={{ padding: '2rem', color: theme.colors.text.primary }}>Wird geladen...</div>;
  }

  return (
    <div style={{ padding: '2rem', background: '#000000', minHeight: '100vh', color: '#ffffff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Trophy size={28} color="#ffd700" />
          <h1 style={{ margin: 0, color: '#ffd700', fontSize: '1.5rem', fontWeight: 'bold' }}>
            Meisterschaften / Ligen
          </h1>
        </div>
        {canEdit && (
          <Button onClick={() => navigate('/leagues/create')}>
            <Plus size={18} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
            Neue Meisterschaft
          </Button>
        )}
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ position: 'relative', maxWidth: '320px', width: '100%' }}>
          <MagnifyingGlass size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Nach Name suchen..."
            style={{ paddingLeft: '36px' }}
          />
        </div>
      </div>

      {filteredLeagues.length === 0 ? (
        <Card style={{ padding: '1.5rem', textAlign: 'center', color: '#cccccc' }}>
          Keine Meisterschaften gefunden.
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {filteredLeagues.map(league => (
            <Card
              key={league.id}
              style={{ padding: '1rem', cursor: 'pointer' }}
              onClick={() => navigate(`/leagues/${league.id}`)}
            >
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#ffd700' }}>{league.name}</h3>
              {league.description && (
                <p style={{ margin: '0 0 0.75rem 0', color: '#cccccc', fontSize: '0.9rem' }}>
                  {league.description}
                </p>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cccccc', fontSize: '0.85rem' }}>
                <span>{league.participant_ids?.length || 0} Teilnehmer</span>
                <span>{league.tournament_ids?.length || 0} Turniere</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
