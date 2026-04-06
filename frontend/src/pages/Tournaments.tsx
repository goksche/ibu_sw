// Tournaments Page - Turnierliste mit Suche, Filter und Verwaltung
import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { tournamentService } from '../services/tournamentService';
import { locationService } from '../services/locationService';
import { settingsService, DEFAULT_APP_SETTINGS } from '../services/settingsService';
import { Tournament } from '../types';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Button,
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
import { Plus, ArrowSquareOut, Trophy, PlayCircle, CheckCircle, Calendar, MagnifyingGlass, MapPin, SquaresFour, Rows, CopySimple, DownloadSimple, Trash, CaretLeft, CaretRight, UsersFour } from 'phosphor-react';

/** Echte Anmeldungen (API), sonst Fallback auf Planungsfelder ko_participants / Gruppenmatrix */
function effectiveParticipantCount(t: Tournament): number {
  const n = t.participant_count;
  if (typeof n === 'number' && n > 0) return n;
  return Math.max(t.ko_participants || 0, (t.groups_count || 0) * (t.participants_per_group || 0));
}

// ─── Mini Calendar ───────────────────────────────────────────────────────────
const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const MONTHS = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];

function MiniCalendar({ month, onPrev, onNext, tournamentDates }: {
  month: Date;
  onPrev: () => void;
  onNext: () => void;
  tournamentDates: Set<string>;
}) {
  const today = new Date();
  const year = month.getFullYear();
  const mon = month.getMonth();

  const firstDay = new Date(year, mon, 1);
  const lastDay = new Date(year, mon + 1, 0);
  // Monday-based offset
  const startOffset = (firstDay.getDay() + 6) % 7;
  const totalCells = startOffset + lastDay.getDate();
  const rows = Math.ceil(totalCells / 7);

  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) cells.push(d);
  while (cells.length < rows * 7) cells.push(null);

  const isToday = (d: number) =>
    d === today.getDate() && mon === today.getMonth() && year === today.getFullYear();

  const hasTournament = (d: number) => {
    const key = `${year}-${String(mon + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    return tournamentDates.has(key);
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button type="button" onClick={onPrev} className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
          <CaretLeft size={13} weight="bold" />
        </button>
        <span className="text-[0.8rem] font-semibold text-foreground">{MONTHS[mon]} {year}</span>
        <button type="button" onClick={onNext} className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
          <CaretRight size={13} weight="bold" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-y-[2px]">
        {WEEKDAYS.map(d => (
          <div key={d} className="text-center text-[0.6rem] uppercase tracking-wider text-muted-foreground pb-1">{d}</div>
        ))}
        {cells.map((day, i) => (
          <div key={i} className="flex items-center justify-center">
            {day ? (
              <div className={cn(
                'relative flex h-[22px] w-[22px] items-center justify-center rounded-full text-[0.72rem] transition-colors cursor-default',
                isToday(day) ? 'bg-primary text-primary-foreground font-bold' : 'text-foreground hover:bg-accent',
              )}>
                {day}
                {hasTournament(day) && !isToday(day) && (
                  <span className="absolute bottom-[1px] left-1/2 -translate-x-1/2 h-[3px] w-[3px] rounded-full bg-warning" />
                )}
              </div>
            ) : <div className="h-[22px] w-[22px]" />}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Dashboard View ───────────────────────────────────────────────────────────
interface DashboardViewProps {
  filteredTournaments: Tournament[];
  selectedTournament: Tournament | undefined;
  setSelectedTournamentId: (id: number | null) => void;
  upcomingTournaments: Tournament[];
  locationNames: Record<number, string>;
  stats: { total: number; running: number; completed: number; planned: number };
  calendarMonth: Date;
  setCalendarMonth: (d: Date) => void;
  getNormalizedStatus: (s?: string) => string;
  getProgress: (s?: string) => number;
  getStatusVisual: (s?: string) => { chip: string; progress: string; cardTop: string; kpiBorder: string; kpiIcon: string };
  navigate: (path: string) => void;
}

function DashboardView({
  filteredTournaments, selectedTournament, setSelectedTournamentId,
  upcomingTournaments, locationNames, stats, calendarMonth, setCalendarMonth,
  getNormalizedStatus, getProgress, getStatusVisual, navigate,
}: DashboardViewProps) {
  const tournamentDates = useMemo(() => {
    const s = new Set<string>();
    filteredTournaments.forEach(t => { if (t.start_date) s.add(t.start_date.slice(0, 10)); });
    return s;
  }, [filteredTournaments]);

  const prevMonth = () => {
    const d = new Date(calendarMonth); d.setMonth(d.getMonth() - 1); setCalendarMonth(d);
  };
  const nextMonth = () => {
    const d = new Date(calendarMonth); d.setMonth(d.getMonth() + 1); setCalendarMonth(d);
  };

  const totalParticipants = filteredTournaments.reduce((sum, t) => sum + effectiveParticipantCount(t), 0);

  return (
    <div className="grid gap-5 lg:grid-cols-[1.55fr_1fr]">
      {/* Left: compact tournament list */}
      <Card className="overflow-hidden p-0">
        {filteredTournaments.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">Keine Turniere gefunden</div>
        ) : (
          <div className="divide-y divide-border">
            {filteredTournaments.map((tournament) => {
              const sv = getStatusVisual(tournament.status);
              const isSelected = tournament.id === selectedTournament?.id;
              const participantCount = effectiveParticipantCount(tournament);
              return (
                <button
                  type="button"
                  key={tournament.id}
                  onClick={() => { setSelectedTournamentId(tournament.id); navigate(`/tournaments/${tournament.id}`); }}
                  className={cn(
                    'w-full border-l-[3px] px-4 py-[10px] text-left transition-colors hover:bg-accent/30',
                    isSelected ? 'border-l-primary' : 'border-l-transparent'
                  )}
                >
                  <div className="flex items-center justify-between gap-3 mb-[5px]">
                    <div className="flex items-center gap-[7px] min-w-0">
                      <span className={cn('h-[7px] w-[7px] shrink-0 rounded-full', sv.progress)} />
                      <span className="text-[0.85rem] font-semibold text-foreground truncate">{tournament.name}</span>
                    </div>
                    <span className={cn('shrink-0 rounded-full border px-[8px] py-[2px] text-[0.63rem] font-semibold', sv.chip)}>
                      {tournament.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-[2px] text-[0.7rem] text-muted-foreground mb-[7px] pl-[15px]">
                    <span className="inline-flex items-center gap-1"><Calendar size={10} />{tournament.start_date}</span>
                    {tournament.location_id && locationNames[tournament.location_id] && (
                      <span className="inline-flex items-center gap-1"><MapPin size={10} />{locationNames[tournament.location_id]}</span>
                    )}
                    {tournament.mode && <span className="opacity-70">{tournament.mode}</span>}
                    {participantCount > 0 && (
                      <span className="inline-flex items-center gap-1"><UsersFour size={10} />{participantCount}</span>
                    )}
                  </div>
                  <div className="pl-[15px]">
                    <div className="h-[3px] w-full overflow-hidden rounded-full bg-muted">
                      <div className={cn('h-full rounded-full', sv.progress)} style={{ width: `${getProgress(tournament.status)}%` }} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      {/* Right: Calendar + Upcoming + Stats */}
      <div className="flex flex-col gap-4">
        {/* Calendar */}
        <Card className="p-4">
          <MiniCalendar
            month={calendarMonth}
            onPrev={prevMonth}
            onNext={nextMonth}
            tournamentDates={tournamentDates}
          />
        </Card>

        {/* Demnächst Turnier */}
        <Card className="p-4">
          <div className="mb-2 text-[0.63rem] uppercase tracking-[0.1em] text-muted-foreground">Demnächst Turnier</div>
          {upcomingTournaments.length === 0 ? (
            <div className="text-[0.8rem] text-muted-foreground">Keine geplanten Turniere</div>
          ) : (
            <button
              type="button"
              onClick={() => navigate(`/tournaments/${upcomingTournaments[0].id}`)}
              className="w-full text-left rounded-lg border border-border/70 bg-primary/8 px-3 py-2 hover:bg-primary/15 transition-colors"
            >
              <div className="text-[0.85rem] font-semibold text-foreground">{upcomingTournaments[0].name}</div>
              <div className="text-[0.72rem] text-muted-foreground mt-[3px] flex items-center gap-1">
                <Calendar size={11} />{upcomingTournaments[0].start_date}
              </div>
            </button>
          )}
        </Card>

        {/* Für Vollständigkeit */}
        <Card className="p-4">
          <div className="mb-2 text-[0.63rem] uppercase tracking-[0.1em] text-muted-foreground">Für Vollständigkeit</div>
          <div className="divide-y divide-border">
            {[
              {
                label: 'Gesamt Spiele',
                value: totalParticipants > 0 ? totalParticipants : '—',
              },
              {
                label: 'Aktive Turniere',
                value: stats.running,
              },
              {
                label: 'Letztes Turnier',
                value: (() => {
                  const completed = filteredTournaments
                    .filter(t => getNormalizedStatus(t.status) === 'completed' && t.start_date)
                    .sort((a, b) => b.start_date.localeCompare(a.start_date));
                  return completed[0]?.start_date || '—';
                })(),
              },
              {
                label: 'Bevorstehendes Phase',
                value: upcomingTournaments[0]?.mode || '—',
              },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between py-[7px] text-[0.8rem]">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-semibold text-foreground">{value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function Tournaments() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { canEdit } = useAuth();
  const { t } = useTranslation();
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
  const [viewMode, setViewMode] = useState<'cards' | 'dashboard'>('cards');
  const [selectedTournamentId, setSelectedTournamentId] = useState<number | null>(null);
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
    const d = new Date(); d.setDate(1); return d;
  });
  const [exportBusyId, setExportBusyId] = useState<number | null>(null);
  const [duplicateBusyId, setDuplicateBusyId] = useState<number | null>(null);

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

  const handleDuplicateClick = async (e: React.MouseEvent, tournament: Tournament) => {
    e.stopPropagation();
    if (!canEdit) return;
    setDuplicateBusyId(tournament.id);
    try {
      const created = await tournamentService.duplicate(tournament.id);
      await loadTournaments();
      navigate(`/tournaments/${created.id}`);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : null;
      window.alert(msg || t('tournaments.duplicateError'));
    } finally {
      setDuplicateBusyId(null);
    }
  };

  const handleExportClick = async (e: React.MouseEvent, tournament: Tournament) => {
    e.stopPropagation();
    if (exportBusyId !== null) return;
    setExportBusyId(tournament.id);
    try {
      await tournamentService.exportSnapshot(tournament.id, tournament.name);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : null;
      window.alert(msg || t('tournaments.exportError'));
    } finally {
      setExportBusyId(null);
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
      setDeleteError(t('tournaments.deleteTypeError'));
      return;
    }
    if (deleteTournamentStatus?.toLowerCase() === 'completed' && deletePassword.trim() !== '414141') {
      setDeleteError(t('tournaments.deletePasswordError'));
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
      setDeleteError(err.response?.data?.detail || t('tournaments.deleteError'));
      setDeleting(false);
    }
  };


  // Calculate statistics
  const stats = {
    total: tournaments.length,
    running: tournaments.filter(tr => tr.status?.toLowerCase() === 'laufend' || tr.status?.toLowerCase() === 'running').length,
    completed: tournaments.filter(tr => tr.status?.toLowerCase() === 'abgeschlossen' || tr.status?.toLowerCase() === 'completed').length,
    planned: tournaments.filter(tr => tr.status?.toLowerCase() === 'geplant' || tr.status?.toLowerCase() === 'planned').length,
  };

  // Filter and sort tournaments
  const filteredTournaments = tournaments
    .filter(tr => {
      const matchesSearch = !searchTerm || tr.name.toLowerCase().includes(searchTerm.toLowerCase());
      let matchesStatus = true;
      if (statusFilter !== 'all') {
        const status = tr.status?.toLowerCase() || '';
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

  const getNormalizedStatus = (status?: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'laufend' || s === 'running') return 'running';
    if (s === 'abgeschlossen' || s === 'completed') return 'completed';
    return 'planned';
  };

  const getProgress = (status?: string) => {
    const normalized = getNormalizedStatus(status);
    if (normalized === 'completed') return 100;
    if (normalized === 'running') return 55;
    return 10;
  };

  const getStatusVisual = (status?: string) => {
    const normalized = getNormalizedStatus(status);
    if (normalized === 'completed') {
      return {
        kpiBorder: 'border-success/45',
        kpiIcon: 'bg-success/15 text-success',
        chip: 'bg-success/15 border-success/40 text-success',
        cardTop: 'bg-success',
        progress: 'bg-success',
      };
    }
    if (normalized === 'running') {
      return {
        kpiBorder: 'border-warning/45',
        kpiIcon: 'bg-warning/15 text-warning',
        chip: 'bg-warning/15 border-warning/40 text-warning',
        cardTop: 'bg-warning',
        progress: 'bg-warning',
      };
    }
    return {
      kpiBorder: 'border-info/45',
      kpiIcon: 'bg-info/15 text-info',
      chip: 'bg-info/15 border-info/40 text-info',
      cardTop: 'bg-info',
      progress: 'bg-info',
    };
  };

  useEffect(() => {
    if (filteredTournaments.length === 0) {
      setSelectedTournamentId(null);
      return;
    }
    const exists = filteredTournaments.some((item) => item.id === selectedTournamentId);
    if (!exists) {
      setSelectedTournamentId(filteredTournaments[0].id);
    }
  }, [filteredTournaments, selectedTournamentId]);

  const selectedTournament = filteredTournaments.find((item) => item.id === selectedTournamentId) || filteredTournaments[0];
  const upcomingTournaments = filteredTournaments
    .filter((item) => getNormalizedStatus(item.status) === 'planned')
    .slice(0, 4);

  if (loading) return <div className="p-8 text-foreground">{t('common.loading')}</div>;

  return (
    <div className="page-shell mx-auto max-w-[1420px]">
      {/* Page Title + New Tournament Button */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="m-0 text-foreground text-2xl font-semibold">
          {t('tournaments.title')}
        </h2>
        {canEdit && (
          <Button
            variant="success"
            onClick={() => navigate('/tournaments/create')}
          >
            <Plus size={20} weight="bold" className="mr-2 align-middle" />
            {t('tournaments.newTournament')}
          </Button>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(155px,1fr))] gap-3">
        <Card
          className={cn(
            'relative cursor-pointer overflow-hidden border bg-card px-4 py-3 transition-all hover:bg-accent/30',
            statusFilter === 'all' ? 'border-primary shadow-md' : 'border-border'
          )}
          onClick={() => setStatusFilter('all')}
        >
          <div className="absolute inset-x-0 top-0 h-[2px] bg-primary" />
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
              <Trophy size={17} weight="fill" />
            </div>
            <div>
              <div className="text-[0.65rem] uppercase tracking-[0.08em] text-muted-foreground">{t('tournaments.count.total')}</div>
              <div className="text-[1.5rem] font-bold leading-tight text-foreground">{stats.total}</div>
            </div>
          </div>
        </Card>

        <Card
          className={cn(
            'relative cursor-pointer overflow-hidden border bg-card px-4 py-3 transition-all hover:bg-accent/30',
            statusFilter === 'laufend' ? 'border-warning shadow-md' : 'border-border'
          )}
          onClick={() => setStatusFilter('laufend')}
        >
          <div className="absolute inset-x-0 top-0 h-[2px] bg-warning" />
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-warning/15 text-warning">
              <PlayCircle size={17} weight="fill" />
            </div>
            <div>
              <div className="text-[0.65rem] uppercase tracking-[0.08em] text-muted-foreground">{t('tournaments.count.running')}</div>
              <div className="text-[1.5rem] font-bold leading-tight text-foreground">{stats.running}</div>
            </div>
          </div>
        </Card>

        <Card
          className={cn(
            'relative cursor-pointer overflow-hidden border bg-card px-4 py-3 transition-all hover:bg-accent/30',
            statusFilter === 'abgeschlossen' ? 'border-success shadow-md' : 'border-border'
          )}
          onClick={() => setStatusFilter('abgeschlossen')}
        >
          <div className="absolute inset-x-0 top-0 h-[2px] bg-success" />
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-success/15 text-success">
              <CheckCircle size={17} weight="fill" />
            </div>
            <div>
              <div className="text-[0.65rem] uppercase tracking-[0.08em] text-muted-foreground">{t('tournaments.count.completed')}</div>
              <div className="text-[1.5rem] font-bold leading-tight text-foreground">{stats.completed}</div>
            </div>
          </div>
        </Card>

        <Card
          className={cn(
            'relative cursor-pointer overflow-hidden border bg-card px-4 py-3 transition-all hover:bg-accent/30',
            statusFilter === 'geplant' ? 'border-info shadow-md' : 'border-border'
          )}
          onClick={() => setStatusFilter('geplant')}
        >
          <div className="absolute inset-x-0 top-0 h-[2px] bg-info" />
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-info/15 text-info">
              <Calendar size={17} weight="fill" />
            </div>
            <div>
              <div className="text-[0.65rem] uppercase tracking-[0.08em] text-muted-foreground">{t('tournaments.count.planned')}</div>
              <div className="text-[1.5rem] font-bold leading-tight text-foreground">{stats.planned}</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Toolbar: Cards zeigt Filter-Chips + Suche; Dashboard zeigt Suche + Alle-Dropdown */}
      <div className="mb-6 flex flex-wrap items-center gap-3">

        {/* Suche + Filter-Dropdown – gleich in beiden Modi */}
        <div className="flex flex-1 items-center overflow-hidden rounded-md border border-border bg-card">
          <div className="relative flex-1">
            <MagnifyingGlass
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <input
              type="text"
              placeholder={t('tournaments.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 w-full bg-transparent pl-9 pr-3 text-sm text-foreground placeholder-muted-foreground focus:outline-none"
            />
          </div>
          <div className="h-5 w-px bg-border shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 shrink-0 bg-transparent px-3 pr-7 text-sm text-foreground focus:outline-none appearance-none cursor-pointer"
          >
            <option value="all">{t('common.all')}</option>
            <option value="laufend">{t('common.status.running')}</option>
            <option value="geplant">{t('common.status.planned')}</option>
            <option value="abgeschlossen">{t('common.status.completed')}</option>
          </select>
        </div>

        {/* View toggle – immer sichtbar, gleiches Aussehen in beiden Modi */}
        <div className="flex h-9 shrink-0 items-center gap-[3px] rounded-lg border border-border bg-card p-[3px]">
          <button
            type="button"
            onClick={() => setViewMode('cards')}
            className={cn(
              'inline-flex items-center gap-[6px] rounded-md px-3 h-full text-xs font-medium transition-all',
              viewMode === 'cards'
                ? 'bg-primary text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            )}
            title="Kartenansicht"
          >
            <SquaresFour size={14} weight={viewMode === 'cards' ? 'fill' : 'regular'} />
            Karten
          </button>
          <button
            type="button"
            onClick={() => setViewMode('dashboard')}
            className={cn(
              'inline-flex items-center gap-[6px] rounded-md px-3 h-full text-xs font-medium transition-all',
              viewMode === 'dashboard'
                ? 'bg-primary text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            )}
            title="Dashboardansicht"
          >
            <Rows size={14} weight={viewMode === 'dashboard' ? 'fill' : 'regular'} />
            Dashboard
          </button>
        </div>
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
            {t('tournaments.noTournaments')}
          </p>
          {canEdit && (
            <Button
              variant="success"
              onClick={() => navigate('/tournaments/create')}
            >
              <Plus size={20} weight="bold" className="mr-2 align-middle" />
              {t('tournaments.newTournament')}
            </Button>
          )}
        </Card>
      ) : filteredTournaments.length === 0 ? (
        <Card className="p-12 text-center bg-card">
          <MagnifyingGlass size={64} className="text-muted-foreground mb-4 opacity-50 mx-auto" />
          <p className="text-muted-foreground text-lg">
            {t('tournaments.noTournaments')}
          </p>
        </Card>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-5">
          {filteredTournaments.map((tournament) => {
            const cardPc = effectiveParticipantCount(tournament);
            return (
              <Card
                key={tournament.id}
                className="relative flex h-full cursor-pointer flex-col overflow-hidden rounded-xl border border-border bg-card p-0 shadow-sm transition-all hover:-translate-y-1 hover:border-primary/45 hover:shadow-lg"
                onClick={() => navigate(`/tournaments/${tournament.id}`)}
              >
                {/* Status indicator bar */}
                <div className={cn('absolute inset-x-0 top-0 h-[3px]', getStatusVisual(tournament.status).cardTop)} />

                {/* Header */}
                <div className="shrink-0 px-[18px] pt-[16px] pb-[10px]">
                  <div className="flex items-start justify-between gap-2 mb-[6px]">
                    <h3 className="m-0 text-foreground text-[1rem] font-bold flex-1 min-w-0 truncate leading-tight">
                      {tournament.name}
                    </h3>
                    <span className={cn(
                      'shrink-0 inline-flex items-center gap-[5px] rounded-full border px-[9px] py-[3px] text-[0.68rem] font-semibold',
                      getStatusVisual(tournament.status).chip
                    )}>
                      <span className={cn('h-[5px] w-[5px] rounded-full', getStatusVisual(tournament.status).progress)} />
                      {tournament.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[0.75rem] text-muted-foreground">
                    <span className="inline-flex items-center gap-[5px]">
                      <Calendar size={13} className="shrink-0" />
                      {tournament.start_date}
                    </span>
                    {tournament.location_id && locationNames[tournament.location_id] && (
                      <span className="inline-flex items-center gap-[5px]">
                        <MapPin size={13} className="shrink-0" />
                        {locationNames[tournament.location_id]}
                      </span>
                    )}
                    {(!tournament.location_id || !locationNames[tournament.location_id]) && (
                      <span className="inline-flex items-center gap-[5px]">
                        <MapPin size={13} className="shrink-0" />
                        —
                      </span>
                    )}
                  </div>
                </div>

                {/* 2×2 Info Grid */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-[10px] px-[18px] pb-[10px]">
                  <div>
                    <div className="text-[0.62rem] uppercase tracking-[0.1em] text-muted-foreground mb-[3px]">Modus</div>
                    <div className="text-[0.82rem] font-semibold text-foreground">{tournament.mode}</div>
                  </div>
                  <div>
                    <div className="text-[0.62rem] uppercase tracking-[0.1em] text-muted-foreground mb-[3px]">Teilnehmer</div>
                    <div className="text-[0.82rem] font-semibold text-foreground">
                      {cardPc > 0 ? `${cardPc} Spieler` : '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[0.62rem] uppercase tracking-[0.1em] text-muted-foreground mb-[3px]">Gruppen</div>
                    <div className="text-[0.82rem] font-semibold text-foreground">
                      {tournament.groups_count > 0 ? `${tournament.groups_count} Gruppe${tournament.groups_count !== 1 ? 'n' : ''}` : '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[0.62rem] uppercase tracking-[0.1em] text-muted-foreground mb-[3px]">
                      {getNormalizedStatus(tournament.status) === 'completed' ? 'Sieger' : 'Phase'}
                    </div>
                    <div className={cn('text-[0.82rem] font-semibold', getNormalizedStatus(tournament.status) === 'completed' ? 'text-success' : 'text-foreground')}>
                      {getNormalizedStatus(tournament.status) === 'completed'
                        ? (
                            tournament.winner_name
                              ? <span className="inline-flex items-center gap-1 truncate" title={tournament.winner_name}>🏆 {tournament.winner_name}</span>
                              : <span className="inline-flex items-center gap-1 text-muted-foreground">🏆 —</span>
                          )
                        : (tournament.has_group_phase && tournament.has_ko_phase
                            ? `${t('common.mode.groupPhase')} + ${t('common.mode.koPhase')}`
                            : tournament.has_group_phase
                              ? t('common.mode.groupPhase')
                              : tournament.has_ko_phase
                                ? t('common.mode.koPhase')
                                : '—')}
                    </div>
                  </div>
                </div>

                {/* Progress */}
                <div className="px-[18px] pb-[12px]">
                  <div className="h-[4px] w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn('h-full rounded-full transition-all', getStatusVisual(tournament.status).progress)}
                      style={{ width: `${getProgress(tournament.status)}%` }}
                    />
                  </div>
                  <div className="mt-[5px] flex justify-between text-[0.7rem] text-muted-foreground">
                    <span>Spiele</span>
                    <span>{getProgress(tournament.status) === 100 ? '—' : '—'}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-auto flex items-center gap-[6px] border-t border-border bg-background/40 px-[18px] py-[10px]">
                  <Button
                    variant="primary"
                    size="sm"
                    className="flex-1 h-[34px] text-[0.8rem] font-semibold"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/tournaments/${tournament.id}`);
                    }}
                  >
                    <ArrowSquareOut size={15} weight="bold" className="mr-[6px] shrink-0" />
                    Bearbeiten
                  </Button>
                  <button
                    type="button"
                    disabled={!canEdit || duplicateBusyId === tournament.id}
                    className="h-[34px] w-[34px] shrink-0 flex items-center justify-center rounded-lg border border-border bg-background/60 text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-primary/10 transition-all disabled:opacity-40"
                    onClick={(e) => { void handleDuplicateClick(e, tournament); }}
                    title={t('tournaments.duplicate')}
                  >
                    <CopySimple size={15} />
                  </button>
                  <button
                    type="button"
                    disabled={exportBusyId === tournament.id}
                    className="h-[34px] w-[34px] shrink-0 flex items-center justify-center rounded-lg border border-border bg-background/60 text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-primary/10 transition-all disabled:opacity-40"
                    onClick={(e) => { void handleExportClick(e, tournament); }}
                    title={t('tournaments.export')}
                  >
                    <DownloadSimple size={15} weight="bold" />
                  </button>
                  <button
                    type="button"
                    className="h-[34px] w-[34px] shrink-0 flex items-center justify-center rounded-lg border border-border bg-background/60 text-muted-foreground hover:text-destructive hover:border-destructive/45 hover:bg-destructive/10 transition-all"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (canEdit) {
                        handleDeleteClick(tournament.id, tournament.name, tournament.status);
                      }
                    }}
                    disabled={!canEdit}
                    title={t('common.delete')}
                  >
                    <Trash size={17} weight="bold" />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <DashboardView
          filteredTournaments={filteredTournaments}
          selectedTournament={selectedTournament}
          setSelectedTournamentId={setSelectedTournamentId}
          upcomingTournaments={upcomingTournaments}
          locationNames={locationNames}
          stats={stats}
          calendarMonth={calendarMonth}
          setCalendarMonth={setCalendarMonth}
          getNormalizedStatus={getNormalizedStatus}
          getProgress={getProgress}
          getStatusVisual={getStatusVisual}
          navigate={navigate}
        />
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
            <DialogTitle className="text-foreground">{t('tournament.detail.deleteTitle')}</DialogTitle>
          </DialogHeader>
          <DialogDescription className="mb-4 text-muted-foreground">
            {t('tournaments.deleteConfirm', { name: deleteTournamentName })}
          </DialogDescription>
          <p className="mb-2 font-bold text-foreground">
            {t('tournaments.deleteTypeYes')}
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
                {t('tournaments.deletePassword')}
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
              {t('common.cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteConfirm}
              disabled={deleting || deleteConfirmText.trim().toLowerCase() !== 'ja'}
            >
              {deleting ? t('tournaments.deleting') : t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
