// Tournament Detail Page with Tabs
import { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { tournamentService } from '../services/tournamentService';
import { Tournament } from '../types';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

// Import tab content components
import TournamentOverview from '../components/tournament/TournamentOverview';
import TournamentParticipantsContent from '../components/tournament/TournamentParticipantsContent';
import TournamentGroupsContent from '../components/tournament/TournamentGroupsContent';
import TournamentMatchesContent from '../components/tournament/TournamentMatchesContent';
import TournamentTables from '../components/tournament/TournamentTables';

type TabType = 'overview' | 'participants' | 'groups' | 'matches' | 'tables';

export default function TournamentDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const tournamentId = id ? parseInt(id) : 0;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate('/login');
      return;
    }
    
    // Get active tab from URL
    const tabParam = searchParams.get('tab');
    if (tabParam && ['overview', 'participants', 'groups', 'matches', 'tables'].includes(tabParam)) {
      setActiveTab(tabParam as TabType);
    }
    
    if (tournamentId) {
      loadTournament();
    }
  }, [tournamentId, navigate, searchParams]);

  const loadTournament = async () => {
    try {
      const data = await tournamentService.getById(tournamentId);
      setTournament(data);
    } catch (err) {
      console.error('Failed to load tournament:', err);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    // Update URL without navigation
    const newUrl = `/tournaments/${tournamentId}?tab=${tab}`;
    window.history.pushState({}, '', newUrl);
  };

  if (loading) return <div style={{ padding: '2rem' }}>Wird geladen...</div>;
  if (!tournament) return <div style={{ padding: '2rem' }}>Turnier nicht gefunden.</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', alignItems: 'center' }}>
        <div>
          <h1>{tournament.name}</h1>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', alignItems: 'center' }}>
            <span style={{ 
              padding: '0.25rem 0.75rem', 
              background: tournament.status === 'running' ? '#28a745' : tournament.status === 'completed' ? '#6c757d' : '#17a2b8',
              color: 'white',
              borderRadius: '4px',
              fontSize: '0.875rem'
            }}>
              {tournament.status === 'running' ? 'Laufend' : tournament.status === 'completed' ? 'Abgeschlossen' : 'Geplant'}
            </span>
            <span style={{ color: '#666', fontSize: '0.875rem' }}>
              {tournament.start_date}
            </span>
            <span style={{ color: '#666', fontSize: '0.875rem' }}>
              {tournament.mode === 'round_robin' ? 'Round Robin' : tournament.mode === 'knockout' ? 'KO-Phase' : 'Kombiniert'}
            </span>
          </div>
        </div>
        <button 
          onClick={() => navigate('/dashboard')}
          style={{ padding: '0.5rem 1rem', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          ← Zurück
        </button>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '2px solid #dee2e6', marginBottom: '2rem' }}>
        <button
          onClick={() => handleTabChange('overview')}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'overview' ? '2px solid #007bff' : '2px solid transparent',
            cursor: 'pointer',
            color: activeTab === 'overview' ? '#007bff' : '#666',
            fontWeight: activeTab === 'overview' ? 'bold' : 'normal',
            marginBottom: '-2px'
          }}
        >
          Übersicht
        </button>
        <button
          onClick={() => handleTabChange('participants')}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'participants' ? '2px solid #007bff' : '2px solid transparent',
            cursor: 'pointer',
            color: activeTab === 'participants' ? '#007bff' : '#666',
            fontWeight: activeTab === 'participants' ? 'bold' : 'normal',
            marginBottom: '-2px'
          }}
        >
          Teilnehmer
        </button>
        {tournament.has_group_phase && (
          <button
            onClick={() => handleTabChange('groups')}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'groups' ? '2px solid #007bff' : '2px solid transparent',
              cursor: 'pointer',
              color: activeTab === 'groups' ? '#007bff' : '#666',
              fontWeight: activeTab === 'groups' ? 'bold' : 'normal',
              marginBottom: '-2px'
            }}
          >
            Gruppen
          </button>
        )}
        {tournament.has_group_phase && (
          <button
            onClick={() => handleTabChange('matches')}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'matches' ? '2px solid #007bff' : '2px solid transparent',
              cursor: 'pointer',
              color: activeTab === 'matches' ? '#007bff' : '#666',
              fontWeight: activeTab === 'matches' ? 'bold' : 'normal',
              marginBottom: '-2px'
            }}
          >
            Spiele
          </button>
        )}
        <button
          onClick={() => handleTabChange('tables')}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'tables' ? '2px solid #007bff' : '2px solid transparent',
            cursor: 'pointer',
            color: activeTab === 'tables' ? '#007bff' : '#666',
            fontWeight: activeTab === 'tables' ? 'bold' : 'normal',
            marginBottom: '-2px'
          }}
        >
          Tabellen
        </button>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && <TournamentOverview tournament={tournament} />}
        {activeTab === 'participants' && <TournamentParticipantsContent tournamentId={tournamentId} />}
        {activeTab === 'groups' && tournament.has_group_phase && <TournamentGroupsContent tournamentId={tournamentId} tournament={tournament} />}
        {activeTab === 'matches' && tournament.has_group_phase && <TournamentMatchesContent tournamentId={tournamentId} tournament={tournament} />}
        {activeTab === 'tables' && <TournamentTables tournamentId={tournamentId} tournament={tournament} />}
      </div>
    </div>
  );
}

