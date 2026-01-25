// Dashboard Page
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { tournamentService } from '../services/tournamentService';
import { Tournament } from '../types';
import { useNavigate } from 'react-router-dom';
import { Button, Badge, Card, Input } from '../components/ui';
import { theme } from '../theme/theme';
import { Users, Plus, SignOut, Trash, ArrowSquareOut, Trophy, PlayCircle, CheckCircle, Calendar, MagnifyingGlass, Funnel } from 'phosphor-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const { isAuthenticated, canEdit, isAdmin, logout } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [appVersion, setAppVersion] = useState<string>('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteTournamentId, setDeleteTournamentId] = useState<number | null>(null);
  const [deleteTournamentName, setDeleteTournamentName] = useState<string>('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'status'>('date');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    loadTournaments();
    loadVersion();
  }, [isAuthenticated, navigate]);

  const loadVersion = async () => {
    try {
      // Temporarily disabled due to CORS issues
      setAppVersion('1.4.0');
    } catch (err) {
      console.error('Failed to load version:', err);
      // Fallback to package.json version if API fails
      setAppVersion('1.4.0');
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
    logout();
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

  // Calculate statistics
  const stats = {
    total: tournaments.length,
    running: tournaments.filter(t => t.status?.toLowerCase() === 'laufend' || t.status?.toLowerCase() === 'running').length,
    completed: tournaments.filter(t => t.status?.toLowerCase() === 'abgeschlossen' || t.status?.toLowerCase() === 'completed').length,
    planned: tournaments.filter(t => t.status?.toLowerCase() === 'geplant' || t.status?.toLowerCase() === 'planned').length,
  };

  // Filter and sort tournaments
  const filteredTournaments = tournaments
    .filter(t => {
      const matchesSearch = !searchTerm || t.name.toLowerCase().includes(searchTerm.toLowerCase());
      let matchesStatus = true;
      if (statusFilter !== 'all') {
        const status = t.status?.toLowerCase() || '';
        // Map German status names to English equivalents for filtering
        const statusMap: Record<string, string[]> = {
          'geplant': ['planned', 'geplant'],
          'laufend': ['running', 'laufend'],
          'abgeschlossen': ['completed', 'abgeschlossen']
        };
        const filterValue = statusFilter.toLowerCase();
        const allowedStatuses = statusMap[filterValue] || [filterValue];
        matchesStatus = allowedStatuses.includes(status);
      }
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'date':
          return new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
        case 'status':
          return (a.status || '').localeCompare(b.status || '');
        default:
          return 0;
      }
    });

  if (loading) return <div style={{ padding: '2rem', color: theme.colors.text.primary }}>Wird geladen...</div>;

  return (
    <div style={{ 
      padding: '2rem', 
      background: '#000000', 
      minHeight: '100vh',
      color: '#ffffff'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        marginBottom: '1.5rem', 
        alignItems: 'center' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div>
            <h1 style={{
              margin: 0,
              color: '#ffd700',
              fontSize: '1.5rem',
              fontWeight: 'bold',
              letterSpacing: '1px',
              fontFamily: 'Arial, sans-serif',
            }}>
              IBU Turniere
            </h1>
            {appVersion && (
              <p style={{ margin: '0.25rem 0 0 0', color: '#cccccc', fontSize: '0.875rem' }}>
                Turnier-Verwaltung - Version {appVersion}
              </p>
            )}
          </div>
        </div>
        <Button variant="secondary" onClick={handleLogout}>
          <SignOut size={20} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
          Logout
        </Button>
      </div>

      {/* Statistics Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '1rem', 
        marginBottom: '2rem' 
      }}>
        <Card style={{ 
          background: '#ffd700',
          border: 'none',
          borderRadius: '12px',
          padding: '1.5rem',
          color: '#000000',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: statusFilter === 'all' ? '0 4px 12px rgba(255, 215, 0, 0.4)' : '0 2px 8px rgba(255, 215, 0, 0.2)'
        }}
        onMouseEnter={(e: any) => {
          if (statusFilter !== 'all') {
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(255, 215, 0, 0.5)';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }
        }}
        onMouseLeave={(e: any) => {
          if (statusFilter !== 'all') {
            e.currentTarget.style.boxShadow = statusFilter === 'all' ? '0 4px 12px rgba(255, 215, 0, 0.4)' : '0 2px 8px rgba(255, 215, 0, 0.2)';
            e.currentTarget.style.transform = 'translateY(0)';
          }
        }}
        onClick={() => setStatusFilter('all')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Trophy size={32} weight="fill" color="#000000" />
            <div>
              <div style={{ fontSize: '0.875rem', opacity: 0.8, marginBottom: '0.5rem' }}>Gesamt</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>{stats.total}</div>
            </div>
          </div>
        </Card>

        <Card style={{ 
          background: '#ffd700',
          border: 'none',
          borderRadius: '12px',
          padding: '1.5rem',
          color: '#000000',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: statusFilter === 'laufend' ? '0 4px 12px rgba(255, 215, 0, 0.4)' : '0 2px 8px rgba(255, 215, 0, 0.2)'
        }}
        onMouseEnter={(e: any) => {
          if (statusFilter !== 'laufend') {
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(255, 215, 0, 0.5)';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }
        }}
        onMouseLeave={(e: any) => {
          if (statusFilter !== 'laufend') {
            e.currentTarget.style.boxShadow = statusFilter === 'laufend' ? '0 4px 12px rgba(255, 215, 0, 0.4)' : '0 2px 8px rgba(255, 215, 0, 0.2)';
            e.currentTarget.style.transform = 'translateY(0)';
          }
        }}
        onClick={() => setStatusFilter('laufend')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <PlayCircle size={32} weight="fill" color="#000000" />
            <div>
              <div style={{ fontSize: '0.875rem', opacity: 0.8, marginBottom: '0.5rem' }}>Laufend</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>{stats.running}</div>
            </div>
          </div>
        </Card>

        <Card style={{ 
          background: '#ffd700',
          border: 'none',
          borderRadius: '12px',
          padding: '1.5rem',
          color: '#000000',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: statusFilter === 'abgeschlossen' ? '0 4px 12px rgba(255, 215, 0, 0.4)' : '0 2px 8px rgba(255, 215, 0, 0.2)'
        }}
        onMouseEnter={(e: any) => {
          if (statusFilter !== 'abgeschlossen') {
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(255, 215, 0, 0.5)';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }
        }}
        onMouseLeave={(e: any) => {
          if (statusFilter !== 'abgeschlossen') {
            e.currentTarget.style.boxShadow = statusFilter === 'abgeschlossen' ? '0 4px 12px rgba(255, 215, 0, 0.4)' : '0 2px 8px rgba(255, 215, 0, 0.2)';
            e.currentTarget.style.transform = 'translateY(0)';
          }
        }}
        onClick={() => setStatusFilter('abgeschlossen')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <CheckCircle size={32} weight="fill" color="#000000" />
            <div>
              <div style={{ fontSize: '0.875rem', opacity: 0.8, marginBottom: '0.5rem' }}>Abgeschlossen</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>{stats.completed}</div>
            </div>
          </div>
        </Card>

        <Card style={{ 
          background: '#ffd700',
          border: 'none',
          borderRadius: '12px',
          padding: '1.5rem',
          color: '#000000',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: '0 2px 8px rgba(255, 215, 0, 0.2)'
        }}
        onMouseEnter={(e: any) => {
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 215, 0, 0.4)';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={(e: any) => {
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(255, 215, 0, 0.2)';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
        onClick={() => setStatusFilter('geplant')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Calendar size={32} weight="fill" color="#000000" />
            <div>
              <div style={{ fontSize: '0.875rem', opacity: 0.8, marginBottom: '0.5rem' }}>Geplant</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>{stats.planned}</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      {canEdit && (
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          <Button 
            variant="info"
            onClick={() => navigate('/participants')}
            style={{ transition: 'transform 0.2s' }}
            onMouseEnter={(e: any) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={(e: any) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <Users size={20} weight="bold" style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
            Teilnehmer-Verwaltung
          </Button>
          <Button
            variant="secondary"
            onClick={() => navigate('/leagues')}
            style={{ transition: 'transform 0.2s' }}
            onMouseEnter={(e: any) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={(e: any) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <Trophy size={20} weight="bold" style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
            Meisterschaften
          </Button>
          <Button
            variant="success"
            onClick={() => navigate('/tournaments/create')}
            style={{ transition: 'transform 0.2s' }}
            onMouseEnter={(e: any) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={(e: any) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <Plus size={20} weight="bold" style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
            Neues Turnier
          </Button>
          {isAdmin && (
            <Button
              variant="warning"
              onClick={() => navigate('/admin/users')}
              style={{ transition: 'transform 0.2s' }}
              onMouseEnter={(e: any) => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseLeave={(e: any) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <Users size={20} weight="bold" style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
              Benutzer-Verwaltung
            </Button>
          )}
        </div>
      )}

      {/* Search and Filter */}
      <div style={{ 
        display: 'flex', 
        gap: '1rem', 
        marginBottom: '2rem', 
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <div style={{ flex: '1', minWidth: '250px', position: 'relative' }}>
          <MagnifyingGlass 
            size={20} 
            style={{ 
              position: 'absolute', 
              left: '0.75rem', 
              top: '50%', 
              transform: 'translateY(-50%)',
              color: theme.colors.text.secondary,
              pointerEvents: 'none'
            }} 
          />
          <Input
            type="text"
            placeholder="Turniere suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ 
              paddingLeft: '2.5rem',
              width: '100%'
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Funnel size={20} color={theme.colors.text.secondary} />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '0.5rem',
              borderRadius: theme.borderRadius.input,
              border: `1px solid ${theme.colors.border.standard}`,
              background: theme.colors.background.secondary,
              color: theme.colors.text.primary,
              fontSize: '0.875rem'
            }}
          >
            <option value="all">Alle Status</option>
            <option value="geplant">Geplant</option>
            <option value="laufend">Laufend</option>
            <option value="abgeschlossen">Abgeschlossen</option>
          </select>
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'name' | 'date' | 'status')}
          style={{
            padding: '0.5rem',
            borderRadius: theme.borderRadius.input,
            border: `1px solid ${theme.colors.border.standard}`,
            background: theme.colors.background.secondary,
            color: theme.colors.text.primary,
            fontSize: '0.875rem'
          }}
        >
          <option value="date">Sortieren nach: Datum</option>
          <option value="name">Sortieren nach: Name</option>
          <option value="status">Sortieren nach: Status</option>
        </select>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ color: theme.colors.text.primary, margin: 0 }}>
          Turniere {filteredTournaments.length !== tournaments.length && `(${filteredTournaments.length} von ${tournaments.length})`}
        </h2>
      </div>

      
      {tournaments.length === 0 ? (
        <Card style={{ 
          padding: '3rem', 
          textAlign: 'center',
          background: theme.colors.background.card,
          border: `2px dashed ${theme.colors.border.standard}`
        }}>
          <Trophy size={64} color={theme.colors.text.secondary} style={{ marginBottom: '1rem', opacity: 0.5 }} />
          <p style={{ color: theme.colors.text.secondary, fontSize: '1.125rem', marginBottom: '1rem' }}>
            Noch keine Turniere vorhanden.
          </p>
          {canEdit && (
            <Button 
              variant="success"
              onClick={() => navigate('/tournaments/create')}
            >
              <Plus size={20} weight="bold" style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
              Erstes Turnier erstellen
            </Button>
          )}
        </Card>
      ) : filteredTournaments.length === 0 ? (
        <Card style={{ 
          padding: '3rem', 
          textAlign: 'center',
          background: theme.colors.background.card
        }}>
          <MagnifyingGlass size={64} color={theme.colors.text.secondary} style={{ marginBottom: '1rem', opacity: 0.5 }} />
          <p style={{ color: theme.colors.text.secondary, fontSize: '1.125rem' }}>
            Keine Turniere gefunden, die den Filterkriterien entsprechen.
          </p>
        </Card>
      ) : (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1rem'
          }}>
          {filteredTournaments.map((tournament) => {
            const statusVariant = getStatusBadgeVariant(tournament.status);
            const statusColors: Record<string, { bg: string; border: string }> = {
              info: { bg: `${theme.colors.accent.info}15`, border: theme.colors.accent.info },
              warning: { bg: `${theme.colors.accent.warning}15`, border: theme.colors.accent.warning },
              success: { bg: `${theme.colors.accent.success}15`, border: theme.colors.accent.success },
              default: { bg: theme.colors.background.secondary, border: theme.colors.border.standard }
            };
            const colors = statusColors[statusVariant] || statusColors.default;

            return (
              <Card
                key={tournament.id}
                style={{
                  background: theme.colors.background.card,
                  border: `2px solid ${colors.border}`,
                  borderRadius: theme.borderRadius.card,
                  padding: '1.5rem',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: `0 2px 8px ${colors.border}20`,
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                  boxSizing: 'border-box'
                }}
                onMouseEnter={(e: any) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = `0 8px 24px ${colors.border}40`;
                }}
                onMouseLeave={(e: any) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = `0 2px 8px ${colors.border}20`;
                }}
                onClick={() => navigate(`/tournaments/${tournament.id}`)}
              >

                {/* Status indicator bar */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: colors.border
                }} />

                {/* Header */}
                <div style={{ marginBottom: '1rem', flexShrink: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <h3 style={{ 
                      margin: 0, 
                      color: theme.colors.text.primary, 
                      fontSize: '1.25rem',
                      fontWeight: 'bold',
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      marginRight: '0.5rem'
                    }}>
                      {tournament.name}
                    </h3>
                    <Badge variant={statusVariant} style={{ flexShrink: 0 }}>
                      {tournament.status}
                    </Badge>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: theme.colors.text.secondary, fontSize: '0.875rem' }}>
                    <Calendar size={16} />
                    <span>{tournament.start_date}</span>
                  </div>
                </div>

                {/* Info */}
                <div style={{ 
                  padding: '0.75rem',
                  background: colors.bg,
                  borderRadius: theme.borderRadius.input,
                  marginBottom: '1rem',
                  height: '60px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-start',
                  boxSizing: 'border-box'
                }}>
                  <div style={{ color: theme.colors.text.secondary, fontSize: '0.875rem', lineHeight: '1.25rem' }}>
                    Modus: <strong style={{ color: theme.colors.text.primary }}>{tournament.mode}</strong>
                  </div>
                  {tournament.has_group_phase && tournament.has_ko_phase ? (
                    <div style={{ color: theme.colors.text.secondary, fontSize: '0.875rem', marginTop: '0.25rem', lineHeight: '1.25rem' }}>
                      Gruppenphase + KO-Phase
                    </div>
                  ) : (
                    <div style={{ height: '1.25rem', marginTop: '0.25rem' }}></div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'stretch', height: '42px', marginTop: 'auto', flexShrink: 0 }}>
                  <Button
                    variant="primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/tournaments/${tournament.id}`);
                    }}
                    style={{ 
                      flex: 1, 
                      padding: '0 !important',
                      height: '42px !important',
                      minHeight: '42px !important',
                      maxHeight: '42px !important',
                      margin: '0 !important',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      lineHeight: '1 !important',
                      boxSizing: 'border-box',
                      border: '2px solid',
                      borderColor: 'inherit',
                      fontSize: '1rem',
                      fontWeight: '600'
                    }}
                  >
                    <span style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      padding: '0 1rem',
                      height: '100%',
                      lineHeight: '1'
                    }}>
                      <ArrowSquareOut size={18} style={{ marginRight: '0.5rem', flexShrink: 0 }} />
                      Öffnen
                    </span>
                  </Button>
                  {canEdit && (
                    <Button
                      variant="danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(tournament.id, tournament.name);
                      }}
                      style={{ 
                        padding: '0 !important',
                        height: '42px !important',
                        minHeight: '42px !important',
                        maxHeight: '42px !important',
                        margin: '0 !important',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        lineHeight: '1 !important',
                        minWidth: '42px',
                        boxSizing: 'border-box',
                        border: '2px solid',
                        borderColor: 'inherit',
                        fontSize: '1rem',
                        fontWeight: '600'
                      }}
                    >
                      <span style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        padding: '0 1rem',
                        height: '100%',
                        lineHeight: '1'
                      }}>
                        <Trash size={18} style={{ flexShrink: 0 }} />
                      </span>
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
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
