// Tournament Detail Page with Tabs
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { tournamentService } from '../services/tournamentService';
import { Tournament } from '../types';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button, Card, Input, Badge } from '../components/ui';
import { theme } from '../theme/theme';
import { PencilSimple, Copy, Star, Trash, ArrowLeft } from 'phosphor-react';

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
  const { isAuthenticated, canEdit } = useAuth();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
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

  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
    setDeleteConfirmText('');
    setDeleteError(null);
  };

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false);
    setDeleteConfirmText('');
    setDeleteError(null);
  };

  const handleDuplicate = async () => {
    if (!tournament) return;
    
    try {
      const duplicated = await tournamentService.duplicate(tournament.id);
      navigate(`/tournaments/${duplicated.id}`);
    } catch (err: any) {
      console.error('Failed to duplicate tournament:', err);
      alert('Fehler beim Duplizieren des Turniers');
    }
  };

  const handleToggleTemplate = async () => {
    if (!tournament) return;
    
    try {
      const updated = await tournamentService.setAsTemplate(tournament.id, !tournament.is_template);
      setTournament(updated);
    } catch (err: any) {
      console.error('Failed to toggle template:', err);
      alert('Fehler beim Speichern als Vorlage');
    }
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirmText.trim().toLowerCase() !== 'ja') {
      setDeleteError('Bitte geben Sie "Ja" ein, um das Löschen zu bestätigen');
      return;
    }

    setDeleting(true);
    setDeleteError(null);

    try {
      await tournamentService.delete(tournamentId);
      navigate('/dashboard');
    } catch (err: any) {
      setDeleteError(err.response?.data?.detail || 'Fehler beim Löschen des Turniers');
      setDeleting(false);
    }
  };

  const getStatusBadgeVariant = (status: string): 'success' | 'warning' | 'error' | 'info' | 'default' => {
    switch (status.toLowerCase()) {
      case 'planned':
      case 'geplant':
        return 'info';
      case 'running':
      case 'laufend':
        return 'warning';
      case 'completed':
      case 'abgeschlossen':
        return 'success';
      default:
        return 'default';
    }
  };

  if (loading) return <div style={{ padding: '2rem', color: theme.colors.text.primary }}>Wird geladen...</div>;
  if (!tournament) return <div style={{ padding: '2rem', color: theme.colors.text.primary }}>Turnier nicht gefunden.</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto', background: theme.colors.background.primary, minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, color: theme.colors.text.primary }}>{tournament.name}</h1>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', alignItems: 'center' }}>
            <Badge variant={getStatusBadgeVariant(tournament.status)}>
              {tournament.status === 'running' ? 'Laufend' : tournament.status === 'completed' ? 'Abgeschlossen' : 'Geplant'}
            </Badge>
            <span style={{ color: theme.colors.text.secondary, fontSize: '0.875rem' }}>
              {tournament.start_date}
            </span>
            <span style={{ color: theme.colors.text.secondary, fontSize: '0.875rem' }}>
              {tournament.mode === 'round_robin' ? 'Round Robin' : tournament.mode === 'knockout' ? 'KO-Phase' : 'Kombiniert'}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {canEdit && (
            <>
              <Button 
                variant="primary"
                onClick={() => navigate(`/tournaments/${tournamentId}/edit`)}
              >
                <PencilSimple size={20} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                Bearbeiten
              </Button>
              <Button 
                variant="info"
                onClick={handleDuplicate}
              >
                <Copy size={20} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                Duplizieren
              </Button>
              <Button 
                variant={tournament?.is_template ? 'success' : 'warning'}
                onClick={handleToggleTemplate}
              >
                <Star size={20} weight={tournament?.is_template ? 'fill' : 'regular'} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                {tournament?.is_template ? 'Vorlage entfernen' : 'Als Vorlage speichern'}
              </Button>
              <Button 
                variant="danger"
                onClick={handleDeleteClick}
              >
                <Trash size={20} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                Löschen
              </Button>
            </>
          )}
          <Button 
            variant="secondary"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft size={20} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
            Zurück
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: `2px solid ${theme.colors.border.standard}`, marginBottom: '2rem' }}>
        <button
          onClick={() => handleTabChange('overview')}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'overview' ? `2px solid ${theme.colors.accent.primary}` : '2px solid transparent',
            cursor: 'pointer',
            color: activeTab === 'overview' ? theme.colors.accent.primary : theme.colors.text.secondary,
            fontWeight: activeTab === 'overview' ? 'bold' : 'normal',
            marginBottom: '-2px',
            borderRadius: '0px'
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
            borderBottom: activeTab === 'participants' ? `2px solid ${theme.colors.accent.primary}` : '2px solid transparent',
            cursor: 'pointer',
            color: activeTab === 'participants' ? theme.colors.accent.primary : theme.colors.text.secondary,
            fontWeight: activeTab === 'participants' ? 'bold' : 'normal',
            marginBottom: '-2px',
            borderRadius: '0px'
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
              borderBottom: activeTab === 'groups' ? `2px solid ${theme.colors.accent.primary}` : '2px solid transparent',
              cursor: 'pointer',
              color: activeTab === 'groups' ? theme.colors.accent.primary : theme.colors.text.secondary,
              fontWeight: activeTab === 'groups' ? 'bold' : 'normal',
              marginBottom: '-2px',
              borderRadius: '0px'
            }}
          >
            Gruppen
          </button>
        )}
        {tournament.show_matches && (tournament.has_group_phase || tournament.has_ko_phase) && (
          <button
            onClick={() => handleTabChange('matches')}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'matches' ? `2px solid ${theme.colors.accent.primary}` : '2px solid transparent',
              cursor: 'pointer',
              color: activeTab === 'matches' ? theme.colors.accent.primary : theme.colors.text.secondary,
              fontWeight: activeTab === 'matches' ? 'bold' : 'normal',
              marginBottom: '-2px',
              borderRadius: '0px'
            }}
          >
            Spiele
          </button>
        )}
        {tournament.show_tables && (
          <button
            onClick={() => handleTabChange('tables')}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'tables' ? `2px solid ${theme.colors.accent.primary}` : '2px solid transparent',
              cursor: 'pointer',
              color: activeTab === 'tables' ? theme.colors.accent.primary : theme.colors.text.secondary,
              fontWeight: activeTab === 'tables' ? 'bold' : 'normal',
              marginBottom: '-2px',
              borderRadius: '0px'
            }}
          >
            Tabellen
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && <TournamentOverview tournament={tournament} />}
        {activeTab === 'participants' && <TournamentParticipantsContent tournamentId={tournamentId} />}
        {activeTab === 'groups' && tournament.has_group_phase && <TournamentGroupsContent tournamentId={tournamentId} tournament={tournament} />}
        {activeTab === 'matches' && tournament.show_matches && (tournament.has_group_phase || tournament.has_ko_phase) && (
          <TournamentMatchesContent tournamentId={tournamentId} tournament={tournament} />
        )}
        {activeTab === 'tables' && tournament.show_tables && <TournamentTables tournamentId={tournamentId} tournament={tournament} />}
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
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
              Möchten Sie das Turnier "<strong style={{ color: theme.colors.text.primary }}>{tournament.name}</strong>" wirklich löschen? 
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

