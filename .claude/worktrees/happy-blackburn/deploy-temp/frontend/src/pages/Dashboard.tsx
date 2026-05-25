// Dashboard Page
import { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { tournamentService } from '../services/tournamentService';
import { infoService } from '../services/infoService';
import { Tournament } from '../types';
import { useNavigate } from 'react-router-dom';
import { Button, Badge, Card, Input } from '../components/ui';
import { theme } from '../theme/theme';
import { Users, Plus, SignOut, Trash, ArrowSquareOut } from 'phosphor-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [appVersion, setAppVersion] = useState<string>('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteTournamentId, setDeleteTournamentId] = useState<number | null>(null);
  const [deleteTournamentName, setDeleteTournamentName] = useState<string>('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate('/login');
      return;
    }

    loadTournaments();
    loadVersion();
  }, []);

  const loadVersion = async () => {
    try {
      const info = await infoService.getVersion();
      setAppVersion(info.version);
    } catch (err) {
      console.error('Failed to load version:', err);
      // Fallback to package.json version if API fails
      setAppVersion('1.4.1');
    }
  };

  const loadTournaments = async () => {
    try {
      const data = await tournamentService.getAll();
      setTournaments(data);
    } catch (err: any) {
      // Fehler beim Laden der Turniere sollte die Seite nicht blockieren
      // Nur eine Warnung ausgeben, kein Fehler - die Seite funktioniert weiterhin
      if (err?.code === 'ERR_NETWORK' || err?.message?.includes('Network Error')) {
        console.warn('Turniere konnten nicht geladen werden (Netzwerkfehler). Die Seite funktioniert weiterhin.');
      } else {
        // Nur die Nachricht loggen, nicht das Error-Objekt, damit es als Warnung angezeigt wird
        const errorMsg = err?.response?.data?.detail || err?.message || 'Unbekannter Fehler';
        console.warn(`Turniere konnten nicht geladen werden (${errorMsg}). Die Seite funktioniert weiterhin.`);
      }
      // Setze leeres Array, damit die Seite weiterhin funktioniert
      setTournaments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  const handleDeleteClick = (tournamentId: number, tournamentName: string) => {
    setDeleteTournamentId(tournamentId);
    setDeleteTournamentName(tournamentName);
    setShowDeleteDialog(true);
    setDeleteConfirmText('');
    setDeleteError(null);
  };

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false);
    setDeleteTournamentId(null);
    setDeleteTournamentName('');
    setDeleteConfirmText('');
    setDeleteError(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTournamentId) return;

    if (deleteConfirmText.trim().toLowerCase() !== 'ja') {
      setDeleteError('Bitte geben Sie "Ja" ein, um das Löschen zu bestätigen');
      return;
    }

    setDeleting(true);
    setDeleteError(null);

    try {
      await tournamentService.delete(deleteTournamentId);
      // Reload tournaments after deletion
      await loadTournaments();
      setShowDeleteDialog(false);
      setDeleteTournamentId(null);
      setDeleteTournamentName('');
      setDeleteConfirmText('');
    } catch (err: any) {
      setDeleteError(err.response?.data?.detail || 'Fehler beim Löschen des Turniers');
      setDeleting(false);
    }
  };

  const getStatusBadgeVariant = (status: string): 'success' | 'warning' | 'error' | 'info' | 'default' => {
    switch (status.toLowerCase()) {
      case 'geplant':
      case 'planned':
        return 'info';
      case 'laufend':
      case 'running':
        return 'warning';
      case 'abgeschlossen':
      case 'completed':
        return 'success';
      default:
        return 'default';
    }
  };

  if (loading) return <div style={{ padding: '2rem', color: theme.colors.text.primary }}>Wird geladen...</div>;

  return (
    <div style={{ padding: '2rem', background: theme.colors.background.primary, minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, color: theme.colors.text.primary }}>IBU Turniere Dashboard</h1>
          {appVersion && (
            <p style={{ margin: '0.25rem 0 0 0', color: theme.colors.text.secondary, fontSize: '0.875rem' }}>
              Version {appVersion}
            </p>
          )}
        </div>
        <Button variant="secondary" onClick={handleLogout}>
          <SignOut size={20} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
          Logout
        </Button>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <Button 
          variant="info"
          onClick={() => navigate('/participants')}
        >
          <Users size={20} weight="bold" style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
          Teilnehmer-Verwaltung
        </Button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ color: theme.colors.text.primary, margin: 0 }}>Turniere ({tournaments.length})</h2>
        <Button 
          variant="success"
          onClick={() => navigate('/tournaments/create')}
        >
          <Plus size={20} weight="bold" style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
          Neues Turnier
        </Button>
      </div>
      
      {tournaments.length === 0 ? (
        <p style={{ color: theme.colors.text.secondary }}>Noch keine Turniere vorhanden.</p>
      ) : (
        <div style={{
          background: theme.colors.background.card,
          border: `1px solid ${theme.colors.border.standard}`,
          borderRadius: theme.borderRadius.card,
          overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${theme.colors.border.standard}`, background: theme.colors.background.secondary }}>
                <th style={{ padding: '0.75rem', textAlign: 'left', color: theme.colors.text.primary }}>Name</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', color: theme.colors.text.primary }}>Startdatum</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', color: theme.colors.text.primary }}>Status</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', color: theme.colors.text.primary }}>Modus</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', color: theme.colors.text.primary }}>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {tournaments.map((tournament, index) => (
                <tr 
                  key={tournament.id} 
                  style={{ 
                    borderBottom: index < tournaments.length - 1 ? `1px solid ${theme.colors.border.standard}` : 'none',
                    background: theme.colors.background.card
                  }}
                >
                  <td style={{ padding: '0.75rem', color: theme.colors.text.primary }}>{tournament.name}</td>
                  <td style={{ padding: '0.75rem', color: theme.colors.text.secondary }}>{tournament.start_date}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <Badge variant={getStatusBadgeVariant(tournament.status)}>
                      {tournament.status}
                    </Badge>
                  </td>
                  <td style={{ padding: '0.75rem', color: theme.colors.text.secondary }}>{tournament.mode}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <Button
                        variant="primary"
                        onClick={() => navigate(`/tournaments/${tournament.id}`)}
                        style={{ padding: '0.5rem 0.75rem', fontSize: '0.875rem' }}
                      >
                        <ArrowSquareOut size={16} style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} />
                        Öffnen
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => handleDeleteClick(tournament.id, tournament.name)}
                        style={{ padding: '0.5rem 0.75rem', fontSize: '0.875rem' }}
                      >
                        <Trash size={16} style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} />
                        Löschen
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && deleteTournamentId && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <Card style={{ maxWidth: '400px', width: '90%' }}>
            <h2 style={{ marginTop: 0, marginBottom: '1rem', color: theme.colors.text.primary }}>Turnier löschen</h2>
            <p style={{ marginBottom: '1rem', color: theme.colors.text.secondary }}>
              Möchten Sie das Turnier "<strong style={{ color: theme.colors.text.primary }}>{deleteTournamentName}</strong>" wirklich löschen? 
              Diese Aktion kann nicht rückgängig gemacht werden.
            </p>
            <p style={{ marginBottom: '0.5rem', fontWeight: 'bold', color: theme.colors.text.primary }}>
              Geben Sie "Ja" ein, um zu bestätigen:
            </p>
            <Input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Ja"
              disabled={deleting}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && deleteConfirmText.trim().toLowerCase() === 'ja') {
                  handleDeleteConfirm();
                }
              }}
            />
            {deleteError && (
              <div style={{
                padding: '0.75rem',
                background: `${theme.colors.accent.error}20`,
                color: theme.colors.accent.error,
                border: `1px solid ${theme.colors.accent.error}`,
                borderRadius: theme.borderRadius.card,
                marginBottom: '1rem'
              }}>
                {deleteError}
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <Button
                variant="secondary"
                onClick={handleDeleteCancel}
                disabled={deleting}
              >
                Abbrechen
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteConfirm}
                disabled={deleting || deleteConfirmText.trim().toLowerCase() !== 'ja'}
              >
                {deleting ? 'Lösche...' : 'Löschen'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
