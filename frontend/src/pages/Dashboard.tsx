// Dashboard Page
import { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { tournamentService } from '../services/tournamentService';
import { Tournament } from '../types';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate('/login');
      return;
    }

    loadTournaments();
  }, []);

  const loadTournaments = async () => {
    try {
      const data = await tournamentService.getAll();
      setTournaments(data);
    } catch (err) {
      console.error('Failed to load tournaments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  if (loading) return <div style={{ padding: '2rem' }}>Wird geladen...</div>;

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <h1>IBU Turniere Dashboard</h1>
        <button onClick={handleLogout}>Logout</button>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <button 
          onClick={() => navigate('/participants')}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#17a2b8',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: 'bold'
          }}
        >
          👥 Teilnehmer-Verwaltung
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>Turniere ({tournaments.length})</h2>
        <button 
          onClick={() => navigate('/tournaments/create')}
          style={{
            padding: '0.5rem 1rem',
            background: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          + Neues Turnier
        </button>
      </div>
      
      {tournaments.length === 0 ? (
        <p>Noch keine Turniere vorhanden.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ddd' }}>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Name</th>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Startdatum</th>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Status</th>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Modus</th>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {tournaments.map((tournament) => (
              <tr key={tournament.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '0.75rem' }}>{tournament.name}</td>
                <td style={{ padding: '0.75rem' }}>{tournament.start_date}</td>
                <td style={{ padding: '0.75rem' }}>{tournament.status}</td>
                <td style={{ padding: '0.75rem' }}>{tournament.mode}</td>
                <td style={{ padding: '0.75rem' }}>
                  <button
                    onClick={() => navigate(`/tournaments/${tournament.id}`)}
                    style={{ padding: '0.25rem 0.75rem', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem' }}
                  >
                    Öffnen
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

