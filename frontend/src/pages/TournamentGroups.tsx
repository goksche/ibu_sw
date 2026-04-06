// Tournament Groups Page
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { authService } from '../services/authService';
import { tournamentService } from '../services/tournamentService';
import { participantService } from '../services/participantService';
import { groupService, GroupWithParticipants } from '../services/groupService';
import { Tournament, Participant } from '../types';
import { useNavigate, useParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button, Card, Input, Select } from '@/components/ui';

export default function TournamentGroups() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const tournamentId = id ? parseInt(id) : 0;
  const { t } = useTranslation();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [groups, setGroups] = useState<GroupWithParticipants[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAddParticipantForm, setShowAddParticipantForm] = useState<number | null>(null);

  const [formData, setFormData] = useState({ name: '' });
  const [selectedParticipantId, setSelectedParticipantId] = useState<string>('');
  const [generating, setGenerating] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_generateResult, setGenerateResult] = useState<{message: string, groups_processed?: number, matches_created?: number, groups_created?: number, participants_assigned?: number, distribution_method?: string} | null>(null);

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate('/login');
      return;
    }
    if (tournamentId) {
      loadData();
    }
  }, [tournamentId, navigate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const tournamentData = await tournamentService.getById(tournamentId);
      setTournament(tournamentData);

      let groupsData: GroupWithParticipants[] = [];
      try {
        const baseGroups = await groupService.getGroups(tournamentId);
        try {
          groupsData = await Promise.all(
            baseGroups.map(async (g) => await groupService.getGroup(g.id))
          );
        } catch (err) {
          console.error('Failed to load group details:', err);
          groupsData = baseGroups as unknown as GroupWithParticipants[];
        }
      } catch (err) {
        console.error('Failed to load groups:', err);
        groupsData = [];
      }
      setGroups(groupsData);

      try {
        const participantsData = await participantService.getAll();
        setParticipants(participantsData);
      } catch (err) {
        console.error('Failed to load participants:', err);
        setParticipants([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await groupService.createGroup({ tournament_id: tournamentId, name: formData.name });
      setShowCreateForm(false);
      setFormData({ name: '' });
      loadData();
    } catch (err) {
      console.error('Failed to create group:', err);
      alert(t('tournament.groups.createError'));
    }
  };

  const handleAddParticipant = async (groupId: number) => {
    if (!selectedParticipantId) return;

    try {
      await groupService.addParticipant(groupId, { participant_id: parseInt(selectedParticipantId) });
      setShowAddParticipantForm(null);
      setSelectedParticipantId('');
      loadData();
    } catch (err) {
      console.error('Failed to add participant:', err);
      alert(t('tournament.groups.addError'));
    }
  };

  const handleRemoveParticipant = async (groupId: number, participantId: number) => {
    if (!confirm(t('tournament.groups.removeConfirm'))) return;

    try {
      await groupService.removeParticipant(groupId, participantId);
      loadData();
    } catch (err) {
      console.error('Failed to remove participant:', err);
      alert(t('tournament.groups.removeError'));
    }
  };

  const handleDeleteGroup = async (groupId: number) => {
    if (!confirm(t('tournament.groups.deleteConfirm'))) return;

    try {
      await groupService.deleteGroup(groupId);
      loadData();
    } catch (err) {
      console.error('Failed to delete group:', err);
      alert(t('tournament.groups.deleteError'));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleGenerateGroups = async () => {
    if (!confirm(t('tournament.groups.generateConfirm'))) {
      return;
    }

    setGenerating(true);
    setGenerateResult(null);

    try {
      const result = await tournamentService.generateGroups(tournamentId);
      setGenerateResult(result);
      alert(t('tournament.groups.generateSuccess', { groups: result.groups_created, participants: result.participants_assigned, method: result.distribution_method }));
      loadData();
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { detail?: string } } };
      console.error('Failed to generate groups:', err);
      alert(errObj.response?.data?.detail || t('tournament.groups.generateError'));
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateRoundRobin = async () => {
    if (!confirm(t('tournament.groups.roundRobinConfirm'))) {
      return;
    }

    setGenerating(true);
    setGenerateResult(null);

    try {
      const result = await tournamentService.generateRoundRobin(tournamentId);
      setGenerateResult(result);
      alert(t('tournament.groups.roundRobinSuccess', { groups: result.groups_processed, matches: result.matches_created }));
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { detail?: string } } };
      console.error('Failed to generate round robin:', err);
      alert(errObj.response?.data?.detail || t('tournament.groups.roundRobinError'));
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <div className="p-8">{t('common.loading')}</div>;
  if (!tournament) return <div className="p-8">{t('tournament.detail.notFound')}</div>;

  const assignedParticipantIds = new Set<number>();
  groups.forEach((group) => {
    group.participants?.forEach((participant) => {
      assignedParticipantIds.add(participant.id);
    });
  });
  const availableParticipants = participants.filter((participant) => !assignedParticipantIds.has(participant.id));

  return (
    <div className="p-8 max-w-[1400px] mx-auto bg-background min-h-screen text-foreground">
      <div className="flex justify-between mb-8">
        <div>
          <h1>{tournament.name}</h1>
          <p className="text-muted-foreground mt-2">{t('tournament.groups.title')}</p>
        </div>
        <div className="flex gap-4">
          <Button onClick={() => navigate(`/tournaments/${tournamentId}/matches`)}>
            {t('tournament.groups.matches')}
          </Button>
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            {t('common.back')}
          </Button>
        </div>
      </div>

      {!tournament.has_group_phase && (
        <div className="p-4 bg-warning/10 border border-warning rounded-lg mb-8">
          ⚠️ {t('tournament.groups.noGroupPhase')}
        </div>
      )}

      {tournament.has_group_phase &&
        (tournament.groups_count ?? 0) > 1 &&
        tournament.group_distribution === 'seeded' && (
          <Card className="mb-8 p-4 border border-border bg-muted/40">
            <p className="m-0 text-sm text-muted-foreground">{t('tournament.groups.seedingHint')}</p>
            <Button
              type="button"
              variant="outline"
              className="mt-3"
              onClick={() => navigate(`/tournaments/${tournamentId}/participants`)}
            >
              {t('tournament.groups.openParticipants')}
            </Button>
          </Card>
        )}

      {showCreateForm && (
        <Card className="mb-8 p-6 bg-muted border border-border">
          <h2>{t('tournament.groups.createTitle')}</h2>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <Input
                label={t('tournament.groups.groupName')}
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder={t('tournament.groups.groupNamePlaceholder')}
              />
            </div>
            <div className="flex gap-4">
              <Button type="submit">{t('common.create')}</Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => { setShowCreateForm(false); setFormData({ name: '' }); }}
              >
                {t('common.cancel')}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="flex justify-between items-center mb-8">
        <h2>{t('tournament.groups.count', { count: groups.length })}</h2>
        <div className="flex gap-2">
          {!showCreateForm && tournament.has_group_phase && (
            <Button
              variant="warning"
              onClick={handleGenerateGroups}
              disabled={generating}
              className={cn(generating && 'opacity-60 cursor-not-allowed')}
            >
              {generating ? `⏳ ${t('tournament.groups.generating')}` : `🎲 ${t('tournament.groups.generateGroups')}`}
            </Button>
          )}
          {!showCreateForm && tournament.has_group_phase && groups.length > 0 && (
            <Button
              variant="info"
              onClick={handleGenerateRoundRobin}
              disabled={generating}
              className={cn(generating && 'opacity-60 cursor-not-allowed')}
            >
              {generating ? `⏳ ${t('tournament.groups.generating')}` : `⚽ ${t('tournament.groups.generateSchedule')}`}
            </Button>
          )}
          {!showCreateForm && tournament.has_group_phase && (
            <Button onClick={() => setShowCreateForm(true)}>
              {t('tournament.groups.newGroup')}
            </Button>
          )}
        </div>
      </div>

      {groups.length === 0 ? (
        <p>{t('tournament.groups.noGroups')}</p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(400px,1fr))] gap-6">
          {groups.map((group) => (
            <Card key={group.id} className="border border-border overflow-hidden bg-card">
              <div className="bg-info text-info-foreground p-4 font-semibold flex justify-between items-center">
                <span>{group.name}</span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteGroup(group.id)}
                >
                  {t('common.delete')}
                </Button>
              </div>

              <div className="p-4">
                <h3 className="mb-2 text-sm text-muted-foreground">
                  {t('tournament.groups.participantCount', { count: group.participants.length })}
                </h3>

                {group.participants.length === 0 ? (
                  <p className="text-muted-foreground text-sm">{t('tournament.groups.noParticipants')}</p>
                ) : (
                  <ul className="list-none p-0 m-0 mb-4">
                    {group.participants.map((participant) => (
                      <li key={participant.id} className="p-2 bg-muted mb-2 rounded-md flex justify-between items-center">
                        <span>{participant.first_name} {participant.last_name}</span>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="text-xs px-2 py-1"
                          onClick={() => handleRemoveParticipant(group.id, participant.id)}
                        >
                          ✕
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}

                {showAddParticipantForm === group.id ? (
                  <div className="p-3 bg-warning/10 rounded-md">
                    <Select
                      value={selectedParticipantId}
                      onChange={(e) => setSelectedParticipantId(e.target.value)}
                      className="mb-2"
                    >
                      <option value="">{t('tournament.groups.selectParticipant')}</option>
                      {availableParticipants.length === 0 ? (
                        <option value="" disabled>{t('tournament.groups.noAvailable')}</option>
                      ) : (
                        availableParticipants.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.first_name} {p.last_name}
                          </option>
                        ))
                      )}
                    </Select>
                    <div className="flex gap-2">
                      <Button
                        className="flex-1"
                        onClick={() => handleAddParticipant(group.id)}
                        disabled={!selectedParticipantId}
                      >
                        {t('common.add')}
                      </Button>
                      <Button
                        variant="secondary"
                        className="flex-1"
                        onClick={() => { setShowAddParticipantForm(null); setSelectedParticipantId(''); }}
                      >
                        {t('common.cancel')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="info"
                    className="w-full text-sm"
                    onClick={() => setShowAddParticipantForm(group.id)}
                  >
                    {t('tournament.groups.addParticipant')}
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
