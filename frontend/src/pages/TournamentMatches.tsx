// Tournament Matches Page - Display and Manage Group Matches
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { authService } from '../services/authService';
import { tournamentService } from '../services/tournamentService';
import { groupService, GroupWithParticipants } from '../services/groupService';
import { matchService, GroupMatch } from '../services/matchService';
import { Tournament } from '../types';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, Select } from '@/components/ui';

export default function TournamentMatches() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const tournamentId = id ? parseInt(id) : 0;
  const { t } = useTranslation();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [groups, setGroups] = useState<GroupWithParticipants[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [matches, setMatches] = useState<GroupMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMatch, setEditingMatch] = useState<number | null>(null);
  const [scoreForm, setScoreForm] = useState({ score1: '', score2: '' });

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
    try {
      const [tournamentData, groupsData] = await Promise.all([
        tournamentService.getById(tournamentId),
        groupService.getGroups(tournamentId),
      ]);
      setTournament(tournamentData);

      const fullGroups = await Promise.all(
        groupsData.map(async (g) => await groupService.getGroup(g.id))
      );
      setGroups(fullGroups);

      if (fullGroups.length > 0 && !selectedGroupId) {
        setSelectedGroupId(fullGroups[0].id);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedGroupId) {
      loadMatches();
    }
  }, [selectedGroupId]);

  const loadMatches = async () => {
    if (!selectedGroupId) return;

    try {
      const matchesData = await matchService.getGroupMatches(tournamentId, selectedGroupId);
      setMatches(matchesData);
    } catch (err) {
      console.error('Failed to load matches:', err);
    }
  };

  const handleEdit = (match: GroupMatch) => {
    setEditingMatch(match.id);
    setScoreForm({
      score1: match.score1?.toString() || '',
      score2: match.score2?.toString() || '',
    });
  };

  const handleSave = async (matchId: number) => {
    try {
      await matchService.updateGroupMatch(matchId, {
        score1: scoreForm.score1 ? parseInt(scoreForm.score1) : undefined,
        score2: scoreForm.score2 ? parseInt(scoreForm.score2) : undefined,
      });
      setEditingMatch(null);
      setScoreForm({ score1: '', score2: '' });
      loadMatches();
    } catch (err) {
      console.error('Failed to save match:', err);
      alert(t('tournament.matches.saveError'));
    }
  };

  const handleCancel = () => {
    setEditingMatch(null);
    setScoreForm({ score1: '', score2: '' });
  };

  const getParticipantName = (participantId: number | null): string => {
    if (!participantId || !groups.length || !selectedGroupId) return '-';
    const group = groups.find(g => g.id === selectedGroupId);
    if (!group) return '-';
    const participant = group.participants.find(p => p.id === participantId);
    return participant ? `${participant.first_name} ${participant.last_name}` : '-';
  };

  if (loading) return <div className="p-8">{t('common.loading')}</div>;
  if (!tournament) return <div className="p-8">{t('tournament.detail.notFound')}</div>;

  const selectedGroup = groups.find(g => g.id === selectedGroupId);

  return (
    <div className="p-8 max-w-[1200px] mx-auto bg-background min-h-screen text-foreground">
      <div className="flex justify-between mb-8">
        <div>
          <h1>{tournament.name}</h1>
          <p className="text-muted-foreground mt-2">{t('tournament.matches.title')}</p>
        </div>
        <div className="flex gap-4">
          <Button variant="outline" onClick={() => navigate(`/tournaments/${tournamentId}/groups`)}>
            {t('tournament.detail.tabs.groups')}
          </Button>
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            {t('sidebar.dashboard')}
          </Button>
        </div>
      </div>

      {!tournament.has_group_phase && (
        <div className="p-4 bg-warning/10 border border-warning rounded-lg mb-8">
          ⚠️ {t('tournament.groups.noGroupPhase')}
        </div>
      )}

      {groups.length === 0 ? (
        <Card className="p-8 text-center">
          <p>{t('tournament.matches.noGroups')}</p>
          <Button
            className="mt-4"
            onClick={() => navigate(`/tournaments/${tournamentId}/groups`)}
          >
            {t('tournament.matches.createGroups')}
          </Button>
        </Card>
      ) : (
        <>
          <div className="mb-8">
            <Select
              label={t('tournament.matches.selectGroup')}
              value={selectedGroupId || ''}
              onChange={(e) => setSelectedGroupId(parseInt(e.target.value))}
              className="max-w-[300px]"
            >
              {groups.map(group => (
                <option key={group.id} value={group.id}>
                  {`${group.name} (${t('tournament.matches.participantCount', { count: group.participants.length })})`}
                </option>
              ))}
            </Select>
          </div>

          {selectedGroup && (
            <>
              <h2>{t('tournament.matches.groupLabel', { name: selectedGroup.name })}</h2>
              <div className="mb-4 text-muted-foreground">
                {t('tournament.matches.participantCount', { count: selectedGroup.participants.length })}
              </div>

              {matches.length === 0 ? (
                <Card className="p-8 text-center">
                  <p>{t('tournament.matches.noMatches')}</p>
                </Card>
              ) : (
                <div className="bg-muted border border-border rounded-lg overflow-hidden">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-info text-info-foreground">
                        <th className="p-3 text-left">{t('tournament.matches.round')}</th>
                        <th className="p-3 text-left">{t('common.match')}</th>
                        <th className="p-3 text-left">{t('tournament.matches.player1')}</th>
                        <th className="p-3 text-left">{t('tournament.matches.player2')}</th>
                        <th className="p-3 text-center">{t('common.result')}</th>
                        <th className="p-3 text-center">{t('tournament.matches.action')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matches
                        .sort((a, b) => (a.round - b.round) || (a.match_no - b.match_no))
                        .map((match) => (
                        <tr key={match.id} className="border-b border-border">
                          <td className="p-3">{t('tournament.matches.round')} {match.round}</td>
                          <td className="p-3">{t('common.match')} {match.match_no}</td>
                          <td className="p-3">{getParticipantName(match.player1_id)}</td>
                          <td className="p-3">{getParticipantName(match.player2_id)}</td>
                          <td className="p-3 text-center">
                            {editingMatch === match.id ? (
                              <div className="flex gap-2 items-center">
                                <input
                                  type="number"
                                  value={scoreForm.score1}
                                  onChange={(e) => setScoreForm({ ...scoreForm, score1: e.target.value })}
                                  className="w-[60px] p-1 text-center border border-border rounded-md"
                                  min={0}
                                />
                                <span>:</span>
                                <input
                                  type="number"
                                  value={scoreForm.score2}
                                  onChange={(e) => setScoreForm({ ...scoreForm, score2: e.target.value })}
                                  className="w-[60px] p-1 text-center border border-border rounded-md"
                                  min={0}
                                />
                              </div>
                            ) : (
                              <span className="font-bold">
                                {match.score1 !== null && match.score2 !== null
                                  ? `${match.score1} : ${match.score2}`
                                  : '- : -'
                                }
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {editingMatch === match.id ? (
                              <div className="flex gap-2 justify-center">
                                <Button
                                  variant="success"
                                  size="sm"
                                  onClick={() => handleSave(match.id)}
                                >
                                  ✓
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={handleCancel}
                                >
                                  ✕
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="info"
                                size="sm"
                                onClick={() => handleEdit(match)}
                              >
                                {t('common.result')}
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
