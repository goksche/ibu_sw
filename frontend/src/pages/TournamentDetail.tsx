// Tournament Detail Page with Tabs
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { tournamentService } from '../services/tournamentService';
import { locationService } from '../services/locationService';
import { Tournament } from '../types';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Button,
  Input,
  Badge,
  Select,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui';
import { cn } from '@/lib/utils';
import { PencilSimple, Copy, Star, Trash, ArrowLeft, Television, MagnifyingGlass } from 'phosphor-react';

// Import tab content components
import TournamentOverview from '../components/tournament/TournamentOverview';
import TournamentParticipantsContent from '../components/tournament/TournamentParticipantsContent';
import TournamentGroupsContent from '../components/tournament/TournamentGroupsContent';
import TournamentMatchesContent from '../components/tournament/TournamentMatchesContent';
import TournamentTables from '../components/tournament/TournamentTables';
import TournamentOverallScheduleContent from '../components/tournament/TournamentOverallScheduleContent';
import TournamentSharingPanel from '../components/tournament/TournamentSharingPanel';
import CommentSection from '../components/comments/CommentSection';
import PageHeader from '../components/patterns/management/PageHeader';
import MatchListPattern from '../components/patterns/tournament/MatchListPattern';
import { getModeVariantInsight } from '../domain/tournamentModeInsights';

type TabType = 'overview' | 'participants' | 'groups' | 'group_matches' | 'tables' | 'ko';

export default function TournamentDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const tournamentId = id ? parseInt(id) : 0;
  const { isAuthenticated, canEdit } = useAuth();
  const { t } = useTranslation();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [groupMatchesView, setGroupMatchesView] = useState<'group' | 'overall'>('group');
  const [overallScheduleSearch, setOverallScheduleSearch] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [locationName, setLocationName] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    // Get active tab from URL
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      if (tabParam === 'overall') {
        setActiveTab('group_matches');
        setGroupMatchesView('overall');
      } else if (tabParam === 'matches') {
        setActiveTab('group_matches');
        setGroupMatchesView('group');
      } else if (['overview', 'participants', 'groups', 'group_matches', 'tables', 'ko'].includes(tabParam)) {
        setActiveTab(tabParam as TabType);
      }
    }

    if (tournamentId) {
      loadTournament();
    }
  }, [tournamentId, navigate, searchParams]);

  useEffect(() => {
    if (!tournament?.location_id) {
      setLocationName(null);
      return;
    }
    const load = async () => {
      try {
        const loc = await locationService.getById(tournament.location_id!);
        setLocationName(loc.name);
      } catch {
        setLocationName(null);
      }
    };
    load();
  }, [tournament?.location_id]);

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
    setDeletePassword('');
    setDeleteError(null);
    setDeleting(false);
  };

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false);
    setDeleteConfirmText('');
    setDeletePassword('');
    setDeleteError(null);
  };

  const handleDuplicate = async () => {
    if (!tournament) return;

    try {
      const duplicated = await tournamentService.duplicate(tournament.id);
      navigate(`/tournaments/${duplicated.id}`);
    } catch (err: any) {
      console.error('Failed to duplicate tournament:', err);
      alert(t('tournament.detail.duplicateError'));
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!tournament || statusUpdating) return;
    if (newStatus === tournament.status) return;
    setStatusError(null);
    setStatusUpdating(true);
    try {
      const updated = await tournamentService.update(tournament.id, { status: newStatus as 'planned' | 'running' | 'completed' });
      setTournament(updated);
    } catch (err: any) {
      setStatusError(err?.response?.data?.detail || t('tournament.detail.statusChangeError'));
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleToggleTemplate = async () => {
    if (!tournament) return;

    try {
      const updated = await tournamentService.setAsTemplate(tournament.id, !tournament.is_template);
      setTournament(updated);
    } catch (err: any) {
      console.error('Failed to toggle template:', err);
      alert(t('tournament.detail.templateError'));
    }
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirmText.trim().toLowerCase() !== 'ja') {
      setDeleteError(t('tournament.detail.deleteTypeError'));
      return;
    }
    if (tournament?.status === 'completed' && deletePassword.trim() !== '414141') {
      setDeleteError(t('tournament.detail.deletePasswordError'));
      return;
    }

    setDeleting(true);
    setDeleteError(null);

    try {
      await tournamentService.delete(
        tournamentId,
        tournament?.status === 'completed' ? deletePassword.trim() : undefined
      );
      setDeleting(false);
      navigate('/dashboard');
    } catch (err: any) {
      setDeleteError(err.response?.data?.detail || t('tournament.detail.deleteError'));
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

  if (loading) return <div className="p-8 text-foreground">{t('common.loading')}</div>;
  if (!tournament) return <div className="p-8 text-foreground">{t('tournament.detail.notFound')}</div>;

  const groupPhaseEnabled =
    tournament.has_group_phase || tournament.mode === 'round_robin' || tournament.mode === 'combined';
  const koPhaseEnabled = tournament.has_ko_phase || tournament.mode === 'knockout' || tournament.mode === 'combined';
  const showGroupMatchesTab = groupPhaseEnabled && tournament.show_matches;
  const showTablesTab = groupPhaseEnabled && tournament.show_tables;
  const modeInsight = getModeVariantInsight(tournament.mode_variant);

  return (
    <div className="p-8 max-w-[1600px] mx-auto bg-background min-h-screen page-shell">
      <div className="mb-8">
        <PageHeader
          title={tournament.name}
          subtitle={[
            tournament.start_date,
            `${modeInsight.id} - ${modeInsight.title}`,
          ]
            .filter(Boolean)
            .join(' • ')}
          actions={
            <>
              {canEdit && (
                <>
                  <Button
                    variant="primary"
                    onClick={() => navigate(`/tournaments/${tournamentId}/edit`)}
                  >
                    <PencilSimple size={20} className="mr-2 align-middle" />
                    {t('tournament.detail.edit')}
                  </Button>
                  <Button
                    variant="info"
                    onClick={handleDuplicate}
                    disabled={tournament.status === 'completed'}
                  >
                    <Copy size={20} className="mr-2 align-middle" />
                    {t('tournament.detail.duplicate')}
                  </Button>
                  <Button
                    variant={tournament?.is_template ? 'success' : 'warning'}
                    onClick={handleToggleTemplate}
                  >
                    <Star size={20} weight={tournament?.is_template ? 'fill' : 'regular'} className="mr-2 align-middle" />
                    {tournament?.is_template ? t('tournament.detail.removeTemplate') : t('tournament.detail.saveAsTemplate')}
                  </Button>
                  <Button
                    variant="danger"
                    onClick={handleDeleteClick}
                  >
                    <Trash size={20} className="mr-2 align-middle" />
                    {t('tournament.detail.delete')}
                  </Button>
                </>
              )}
              <Button
                variant="secondary"
                onClick={() => window.open(`/tournaments/${tournamentId}/ticker`, '_blank', 'noopener,noreferrer')}
              >
                <Television size={20} className="mr-2 align-middle" />
                {t('tournament.detail.liveTicker')}
              </Button>
              <Button
                variant="secondary"
                onClick={() => navigate('/dashboard')}
              >
                <ArrowLeft size={20} className="mr-2 align-middle" />
                {t('common.back')}
              </Button>
            </>
          }
        />
        <div className="mt-2 flex gap-4 items-center flex-wrap">
            <Badge variant={getStatusBadgeVariant(tournament.status)}>
              {tournament.status === 'running' ? t('common.status.running') : tournament.status === 'completed' ? t('common.status.completed') : t('common.status.planned')}
            </Badge>
            {canEdit && tournament.status !== 'completed' && (
              <div className="inline-block min-w-[140px]">
                <Select
                  label=""
                  value={tournament.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  disabled={statusUpdating}
                  error={statusError || undefined}
                  options={[
                    { value: 'planned', label: t('common.status.planned') },
                    { value: 'running', label: t('common.status.running') },
                    { value: 'completed', label: t('common.status.completed') },
                  ]}
                />
              </div>
            )}
        </div>
      </div>

      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={(v) => handleTabChange(v as TabType)}>
        <TabsList className="flex gap-2 border-b-2 border-border mb-8 rounded-none bg-transparent p-0 h-auto w-full justify-start">
          <TabsTrigger
            value="overview"
            className="rounded-none border-b-2 border-transparent -mb-0.5 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:font-bold bg-transparent px-6 py-3 shadow-none"
          >
            {t('tournament.detail.tabs.overview')}
          </TabsTrigger>
          <TabsTrigger
            value="participants"
            className="rounded-none border-b-2 border-transparent -mb-0.5 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:font-bold bg-transparent px-6 py-3 shadow-none"
          >
            {t('tournament.detail.tabs.participants')}
          </TabsTrigger>
          {groupPhaseEnabled && (
            <TabsTrigger
              value="groups"
              className="rounded-none border-b-2 border-transparent -mb-0.5 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:font-bold bg-transparent px-6 py-3 shadow-none"
            >
              {t('tournament.detail.tabs.groups')}
            </TabsTrigger>
          )}
          {showGroupMatchesTab && (
            <TabsTrigger
              value="group_matches"
              className="rounded-none border-b-2 border-transparent -mb-0.5 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:font-bold bg-transparent px-6 py-3 shadow-none"
            >
              {t('tournament.detail.tabs.groupMatches')}
            </TabsTrigger>
          )}
          {showTablesTab && tournament.ko_structure !== 'consolation_bracket' && (
            <TabsTrigger
              value="tables"
              className="rounded-none border-b-2 border-transparent -mb-0.5 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:font-bold bg-transparent px-6 py-3 shadow-none"
            >
              {t('tournament.detail.tabs.tables')}
            </TabsTrigger>
          )}
          {koPhaseEnabled && (
            <TabsTrigger
              value="ko"
              className="rounded-none border-b-2 border-transparent -mb-0.5 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:font-bold bg-transparent px-6 py-3 shadow-none"
            >
              {t('tournament.detail.tabs.ko')}
            </TabsTrigger>
          )}
        </TabsList>

        {/* Tab Content */}
        <div>
          <TabsContent value="overview" className="mt-0">
            <TournamentOverview tournament={tournament} locationName={locationName} />
            {canEdit && (
              <div className="mt-6">
                <TournamentSharingPanel
                  entityType="tournament"
                  entityId={tournament.id}
                  currentVisibility={((tournament as any).visibility || 'public') as any}
                  onVisibilityChange={(v) => setTournament({ ...tournament, visibility: v } as any)}
                />
              </div>
            )}
            <CommentSection tournamentId={tournament.id} context="standings" className="mt-8" />
          </TabsContent>
          <TabsContent value="participants" className="mt-0">
            <TournamentParticipantsContent
              tournamentId={tournamentId}
              tournament={tournament}
              tournamentRevision={tournament.updated_at}
            />
          </TabsContent>
          <TabsContent value="groups" className="mt-0">
            {groupPhaseEnabled && (
              <TournamentGroupsContent tournamentId={tournamentId} tournament={tournament} />
            )}
            <CommentSection tournamentId={tournament.id} context="groups" className="mt-8" />
          </TabsContent>
          <TabsContent value="group_matches" className="mt-0">
            {showGroupMatchesTab && (
              <MatchListPattern
                title={t('tournament.detail.tabs.groupMatches')}
                toolbar={
                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                  <div className="flex gap-2 flex-wrap shrink-0">
                    <Button
                      variant={groupMatchesView === 'group' ? 'info' : 'secondary'}
                      className={cn(groupMatchesView === 'group' && 'font-bold')}
                      onClick={() => {
                        setGroupMatchesView('group');
                        setOverallScheduleSearch('');
                      }}
                    >
                      {t('tournament.detail.matchViewGroup')}
                    </Button>
                    <Button
                      variant={groupMatchesView === 'overall' ? 'info' : 'secondary'}
                      className={cn(groupMatchesView === 'overall' && 'font-bold')}
                      onClick={() => setGroupMatchesView('overall')}
                    >
                      {t('tournament.detail.matchViewOverall')}
                    </Button>
                  </div>
                  {groupMatchesView === 'overall' && (
                    <div className="flex min-h-[44px] w-full min-w-0 flex-1 items-center gap-2 rounded-lg border-2 border-primary/40 bg-muted px-3 py-2 sm:max-w-xl">
                      <MagnifyingGlass className="h-5 w-5 shrink-0 text-primary" weight="bold" aria-hidden />
                      <span className="text-sm font-semibold text-foreground shrink-0">
                        {t('common.search')}
                      </span>
                      <Input
                        type="search"
                        value={overallScheduleSearch}
                        onChange={(e) => setOverallScheduleSearch(e.target.value)}
                        placeholder={t('tournament.detail.overallScheduleSearchPlaceholder')}
                        aria-label={t('tournament.detail.overallScheduleSearchPlaceholder')}
                        className="min-w-0 flex-1 border-border bg-background"
                      />
                    </div>
                  )}
                </div>
                }
              >
                {groupMatchesView === 'group' ? (
                  <TournamentMatchesContent tournamentId={tournamentId} tournament={tournament} view="group" />
                ) : (
                  <TournamentOverallScheduleContent
                    tournamentId={tournamentId}
                    tournament={tournament}
                    scheduleSearch={overallScheduleSearch}
                    onScheduleSearchChange={setOverallScheduleSearch}
                  />
                )}
                <CommentSection tournamentId={tournament.id} context="schedule" className="mt-8" />
              </MatchListPattern>
            )}
          </TabsContent>
          <TabsContent value="tables" className="mt-0">
            {showTablesTab && tournament.ko_structure !== 'consolation_bracket' && (
              <TournamentTables tournamentId={tournamentId} tournament={tournament} />
            )}
          </TabsContent>
          <TabsContent value="ko" className="mt-0">
            {koPhaseEnabled && (
              <TournamentMatchesContent tournamentId={tournamentId} tournament={tournament} view="ko" />
            )}
            <CommentSection tournamentId={tournament.id} context="ko" className="mt-8" />
          </TabsContent>
        </div>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={(open) => !open && handleDeleteCancel()}>
        <DialogContent className="max-w-[400px] w-[90%]">
          <DialogHeader>
            <DialogTitle className="mt-0 mb-4 text-foreground">{t('tournament.detail.deleteTitle')}</DialogTitle>
            <DialogDescription className="mb-4 text-muted-foreground">
              {t('tournament.detail.deleteConfirm', { name: tournament.name })}
            </DialogDescription>
          </DialogHeader>
          <p className="mb-2 font-bold text-foreground">{t('tournament.detail.deleteTypeYes')}</p>
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
          {tournament.status === 'completed' && (
            <>
              <p className="mt-4 mb-2 font-bold text-foreground">{t('tournament.detail.deletePassword')}</p>
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
              />
            </>
          )}
          {deleteError && (
            <div className="p-3 bg-destructive/10 text-destructive border border-destructive rounded-lg mb-4">
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
              {deleting ? t('tournament.detail.deleting') : t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
