// Tournaments Page - Turnierliste mit Suche, Filter und Verwaltung
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { tournamentService } from '../services/tournamentService';
import { locationService } from '../services/locationService';
import { settingsService, DEFAULT_APP_SETTINGS } from '../services/settingsService';
import { Tournament } from '../types';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Button,
  Badge,
  Card,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui';
import { cn } from '@/lib/utils';
import { Plus, Trash, ArrowSquareOut, Trophy, PlayCircle, CheckCircle, Calendar, MagnifyingGlass, Funnel, MapPin } from 'phosphor-react';

export default function Tournaments() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { canEdit } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteTournamentId, setDeleteTournamentId] = useState<number | null>(null);
  const [deleteTournamentName, setDeleteTournamentName] = useState<string>('');
  const [deleteTournamentStatus, setDeleteTournamentStatus] = useState<string | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || 'all');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'status'>(DEFAULT_APP_SETTINGS.dashboard.default_sort);
  const [locationNames, setLocationNames] = useState<Record<number, string>>({});

  const loadSettings = async () => {
    try {
      const appSettings = await settingsService.getSettings();
      setSortBy(appSettings.dashboard?.default_sort || DEFAULT_APP_SETTINGS.dashboard.default_sort);
    } catch {
      setSortBy(DEFAULT_APP_SETTINGS.dashboard.default_sort);
    }
  };

  useEffect(() => {
    loadTournaments();
    loadSettings();
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const list = await locationService.getAll();
        const map: Record<number, string> = {};
        list.forEach(loc => { map[loc.id] = loc.name; });
        setLocationNames(map);
      } catch {
        setLocationNames({});
      }
    };
    load();
  }, []);

  // URL-Parameter fuer Status-Filter auswerten
  useEffect(() => {
    const statusParam = searchParams.get('status');
    if (statusParam) {
      setStatusFilter(statusParam);
    }
  }, [searchParams]);

  const loadTournaments = async () => {
    try {
      const data = await tournamentService.getAll();
      setTournaments(data);
    } catch (err: any) {
      if (err?.code === 'ERR_NETWORK' || err?.message?.includes('Network Error')) {
        console.warn('Turniere konnten nicht geladen werden (Netzwerkfehler).');
      } else {
        const errorMsg = err?.response?.data?.detail || err?.message || 'Unbekannter Fehler';
        console.warn(`Turniere konnten nicht geladen werden (${errorMsg}).`);
      }
      setTournaments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (tournamentId: number, tournamentName: string, tournamentStatus: string) => {
    setDeleteTournamentId(tournamentId);
    setDeleteTournamentName(tournamentName);
    setDeleteTournamentStatus(tournamentStatus);
    setShowDeleteDialog(true);
    setDeleteConfirmText('');
    setDeletePassword('');
    setDeleteError(null);
    setDeleting(false);
  };

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false);
    setDeleteTournamentId(null);
    setDeleteTournamentName('');
    setDeleteTournamentStatus(null);
    setDeleteConfirmText('');
    setDeletePassword('');
    setDeleteError(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTournamentId) return;

    if (deleteConfirmText.trim().toLowerCase() !== 'ja') {
      setDeleteError('Bitte geben Sie "Ja" ein, um das Löschen zu bestätigen');
      return;
    }
    if (deleteTournamentStatus?.toLowerCase() === 'completed' && deletePassword.trim() !== '414141') {
      setDeleteError('Passwort erforderlich oder falsch. Bitte Passwort 414141 eingeben.');
      return;
    }

    setDeleting(true);
    setDeleteError(null);

    try {
      await tournamentService.delete(
        deleteTournamentId,
        deleteTournamentStatus?.toLowerCase() === 'completed' ? deletePassword.trim() : undefined
      );
      await loadTournaments();
      setShowDeleteDialog(false);
      setDeleteTournamentId(null);
      setDeleteTournamentName('');
      setDeleteTournamentStatus(null);
      setDeleteConfirmText('');
      setDeletePassword('');
      setDeleting(false);
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

  const getStatusCardClasses = (variant: 'success' | 'warning' | 'error' | 'info' | 'default') => {
    const base = 'rounded-lg border-2 p-6 transition-all cursor-pointer flex flex-col h-full relative overflow-hidden shadow-sm hover:-translate-y-1 hover:shadow-lg';
    const variants = {
      info: 'border-info',
      warning: 'border-warning',
      success: 'border-success',
      error: 'border-destructive',
      default: 'border-border',
    };
    return cn(base, variants[variant] || variants.default);
  };

  const getStatusBarClasses = (variant: 'success' | 'warning' | 'error' | 'info' | 'default') => {
    const base = 'absolute top-0 left-0 right-0 h-1';
    const variants = {
      info: 'bg-info',
      warning: 'bg-warning',
      success: 'bg-success',
      error: 'bg-destructive',
      default: 'bg-border',
    };
    return cn(base, variants[variant] || variants.default);
  };

  const getStatusInfoBoxClasses = (variant: 'success' | 'warning' | 'error' | 'info' | 'default') => {
    const base = 'rounded-md p-3 min-h-[60px] flex flex-col justify-start mb-4';
    const variants = {
      info: 'bg-info/10',
      warning: 'bg-warning/10',
      success: 'bg-success/10',
      error: 'bg-destructive/10',
      default: 'bg-muted',
    };
    return cn(base, variants[variant] || variants.default);
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

  if (loading) return <div className="p-8 text-foreground">Wird geladen...</div>;

  return (
    <div>
      {/* Page Title + New Tournament Button */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="m-0 text-foreground text-2xl font-semibold">
          Turniere
        </h2>
        {canEdit && (
          <Button
            variant="success"
            onClick={() => navigate('/tournaments/create')}
          >
            <Plus size={20} weight="bold" className="mr-2 align-middle" />
            Neues Turnier
          </Button>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mb-8">
        <Card
          className={cn(
            'p-6 cursor-pointer transition-all bg-card',
            statusFilter === 'all' ? 'border-2 border-primary shadow-md' : 'border border-border hover:border-primary hover:shadow-md'
          )}
          onClick={() => setStatusFilter('all')}
        >
          <div className="flex items-center gap-4">
            <Trophy size={32} weight="fill" className="text-primary shrink-0" />
            <div>
              <div className="text-sm text-muted-foreground mb-2">Gesamt</div>
              <div className="text-3xl font-bold text-foreground">{stats.total}</div>
            </div>
          </div>
        </Card>

        <Card
          className={cn(
            'p-6 cursor-pointer transition-all bg-card',
            statusFilter === 'laufend' ? 'border-2 border-primary shadow-md' : 'border border-border hover:border-primary hover:shadow-md'
          )}
          onClick={() => setStatusFilter('laufend')}
        >
          <div className="flex items-center gap-4">
            <PlayCircle size={32} weight="fill" className="text-primary shrink-0" />
            <div>
              <div className="text-sm text-muted-foreground mb-2">Laufend</div>
              <div className="text-3xl font-bold text-foreground">{stats.running}</div>
            </div>
          </div>
        </Card>

        <Card
          className={cn(
            'p-6 cursor-pointer transition-all bg-card',
            statusFilter === 'abgeschlossen' ? 'border-2 border-primary shadow-md' : 'border border-border hover:border-primary hover:shadow-md'
          )}
          onClick={() => setStatusFilter('abgeschlossen')}
        >
          <div className="flex items-center gap-4">
            <CheckCircle size={32} weight="fill" className="text-primary shrink-0" />
            <div>
              <div className="text-sm text-muted-foreground mb-2">Abgeschlossen</div>
              <div className="text-3xl font-bold text-foreground">{stats.completed}</div>
            </div>
          </div>
        </Card>

        <Card
          className={cn(
            'p-6 cursor-pointer transition-all bg-card',
            statusFilter === 'geplant' ? 'border-2 border-primary shadow-md' : 'border border-border hover:border-primary hover:shadow-md'
          )}
          onClick={() => setStatusFilter('geplant')}
        >
          <div className="flex items-center gap-4">
            <Calendar size={32} weight="fill" className="text-primary shrink-0" />
            <div>
              <div className="text-sm text-muted-foreground mb-2">Geplant</div>
              <div className="text-3xl font-bold text-foreground">{stats.planned}</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4 mb-8 flex-wrap items-center">
        <div className="flex-1 min-w-[250px] relative">
          <MagnifyingGlass
            size={20}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <Input
            type="text"
            placeholder="Turniere suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
        <div className="flex gap-2 items-center">
          <Funnel size={20} className="text-muted-foreground shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <option value="date">Sortieren nach: Datum</option>
          <option value="name">Sortieren nach: Name</option>
          <option value="status">Sortieren nach: Status</option>
        </select>
      </div>

      {/* Result count */}
      {filteredTournaments.length !== tournaments.length && (
        <div className="mb-4 text-muted-foreground text-sm">
          {filteredTournaments.length} von {tournaments.length} Turnieren
        </div>
      )}

      {/* Tournament Grid */}
      {tournaments.length === 0 ? (
        <Card className="p-12 text-center bg-card border-2 border-dashed border-border">
          <Trophy size={64} className="text-muted-foreground mb-4 opacity-50 mx-auto" />
          <p className="text-muted-foreground text-lg mb-4">
            Noch keine Turniere vorhanden.
          </p>
          {canEdit && (
            <Button
              variant="success"
              onClick={() => navigate('/tournaments/create')}
            >
              <Plus size={20} weight="bold" className="mr-2 align-middle" />
              Erstes Turnier erstellen
            </Button>
          )}
        </Card>
      ) : filteredTournaments.length === 0 ? (
        <Card className="p-12 text-center bg-card">
          <MagnifyingGlass size={64} className="text-muted-foreground mb-4 opacity-50 mx-auto" />
          <p className="text-muted-foreground text-lg">
            Keine Turniere gefunden, die den Filterkriterien entsprechen.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
          {filteredTournaments.map((tournament) => {
            const statusVariant = getStatusBadgeVariant(tournament.status);

            return (
              <Card
                key={tournament.id}
                className={getStatusCardClasses(statusVariant)}
                onClick={() => navigate(`/tournaments/${tournament.id}`)}
              >
                {/* Status indicator bar */}
                <div className={getStatusBarClasses(statusVariant)} />

                {/* Header */}
                <div className="mb-4 shrink-0">
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <h3 className="m-0 text-foreground text-xl font-bold flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
                      {tournament.name}
                    </h3>
                    <Badge variant={statusVariant} className="shrink-0">
                      {tournament.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Calendar size={16} className="shrink-0" />
                    <span>{tournament.start_date}</span>
                  </div>
                  {tournament.location_id && locationNames[tournament.location_id] && (
                    <div className="flex items-center gap-2 text-muted-foreground text-sm mt-1">
                      <MapPin size={16} className="shrink-0" />
                      <span>{locationNames[tournament.location_id]}</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className={getStatusInfoBoxClasses(statusVariant)}>
                  <div className="text-muted-foreground text-sm leading-5">
                    Modus: <strong className="text-foreground">{tournament.mode}</strong>
                  </div>
                  {tournament.has_group_phase && tournament.has_ko_phase ? (
                    <div className="text-muted-foreground text-sm mt-1 leading-5">
                      Gruppenphase + KO-Phase
                    </div>
                  ) : (
                    <div className="h-5 mt-1" />
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 items-stretch h-[42px] mt-auto shrink-0">
                  <Button
                    variant="primary"
                    size="lg"
                    className="flex-1 h-[42px] min-h-[42px] max-h-[42px] font-semibold text-base"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/tournaments/${tournament.id}`);
                    }}
                  >
                    <span className="inline-flex items-center justify-center px-4 h-full">
                      <ArrowSquareOut size={18} className="mr-2 shrink-0" />
                      Öffnen
                    </span>
                  </Button>
                  {canEdit && (
                    <Button
                      variant="danger"
                      size="icon"
                      className="h-[42px] min-h-[42px] w-[42px] shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(tournament.id, tournament.name, tournament.status);
                      }}
                    >
                      <Trash size={18} className="shrink-0" />
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={showDeleteDialog && !!deleteTournamentId}
        onOpenChange={(open) => {
          if (!open) handleDeleteCancel();
        }}
      >
        <DialogContent className="max-w-[400px] w-[90%]">
          <DialogHeader>
            <DialogTitle className="text-foreground">Turnier löschen</DialogTitle>
          </DialogHeader>
          <DialogDescription className="mb-4 text-muted-foreground">
            Möchten Sie das Turnier "<strong className="text-foreground">{deleteTournamentName}</strong>" wirklich löschen?
            Diese Aktion kann nicht rückgängig gemacht werden.
          </DialogDescription>
          <p className="mb-2 font-bold text-foreground">
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
            className="mb-4"
          />
          {deleteTournamentStatus?.toLowerCase() === 'completed' && (
            <>
              <p className="mt-4 mb-2 font-bold text-foreground">
                Passwort für abgeschlossenes Turnier:
              </p>
              <Input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Passwort"
                disabled={deleting}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && deleteConfirmText.trim().toLowerCase() === 'ja') {
                    handleDeleteConfirm();
                  }
                }}
                className="mb-4"
              />
            </>
          )}
          {deleteError && (
            <div className="p-3 bg-destructive/20 text-destructive border border-destructive rounded-lg mb-4">
              {deleteError}
            </div>
          )}
          <DialogFooter className="flex gap-2 justify-end">
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
