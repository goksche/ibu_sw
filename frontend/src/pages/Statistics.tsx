import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '../components/ui';
import { Trophy, Users, MapPin, SoccerBall, Calendar, Funnel, ArrowUp, ArrowDown, Minus } from 'phosphor-react';
import {
  statisticsService,
  OverviewStats,
  ParticipantsRankingResponse,
  ParticipantDetailStats,
  DateRangeParams,
} from '../services/statisticsService';

const MODE_KEYS: Record<string, string> = {
  round_robin: 'common.mode.groupPhase',
  knockout: 'common.mode.koPhase',
  combined: 'common.mode.combined',
};

const STATUS_KEYS: Record<string, string> = {
  planned: 'common.status.planned',
  running: 'common.status.running',
  completed: 'common.status.completed',
};

const PRESETS = [
  { label: '1M', value: '1m' as const },
  { label: '3M', value: '3m' as const },
  { label: '6M', value: '6m' as const },
  { label: '12M', value: '12m' as const },
];

const BAR_COLORS = ['var(--color-primary)', 'var(--color-info)', 'var(--color-success)', 'var(--color-warning)'];
const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

function SimpleBarChart({ data, labelKey, valueKey }: { data: any[]; labelKey: string; valueKey: string }) {
  const { t } = useTranslation();
  if (!data.length) return <p className="text-sm text-muted-foreground text-center py-8">{t('common.noData')}</p>;
  const max = Math.max(...data.map(d => d[valueKey]), 1);
  return (
    <div className="flex items-end gap-1.5 h-48 px-2">
      {data.map((d, i) => {
        const pct = (d[valueKey] / max) * 100;
        return (
          <div key={i} className="flex-1 flex flex-col items-center justify-end h-full min-w-0">
            <span className="text-xs font-semibold text-foreground mb-1">{d[valueKey]}</span>
            <div
              className="w-full rounded-t transition-all duration-300"
              style={{ height: `${Math.max(pct, 4)}%`, backgroundColor: BAR_COLORS[i % BAR_COLORS.length], minHeight: 4 }}
            />
            <span className="text-[0.6rem] text-muted-foreground mt-1 truncate w-full text-center">
              {d[labelKey]?.slice(-5) || ''}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function SimplePieChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const { t } = useTranslation();
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return <p className="text-sm text-muted-foreground text-center py-8">{t('common.noData')}</p>;

  let cumulative = 0;
  const slices = data.map((d) => {
    const start = cumulative;
    cumulative += (d.value / total) * 360;
    return { ...d, startAngle: start, endAngle: cumulative };
  });

  const toRad = (deg: number) => ((deg - 90) * Math.PI) / 180;
  const cx = 80, cy = 80, r = 70;

  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 160 160" className="w-40 h-40 shrink-0">
        {slices.map((s, i) => {
          if (s.value === 0) return null;
          if (s.value === total) {
            return <circle key={i} cx={cx} cy={cy} r={r} fill={s.color} />;
          }
          const x1 = cx + r * Math.cos(toRad(s.startAngle));
          const y1 = cy + r * Math.sin(toRad(s.startAngle));
          const x2 = cx + r * Math.cos(toRad(s.endAngle));
          const y2 = cy + r * Math.sin(toRad(s.endAngle));
          const large = s.endAngle - s.startAngle > 180 ? 1 : 0;
          return (
            <path
              key={i}
              d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z`}
              fill={s.color}
            />
          );
        })}
      </svg>
      <div className="flex flex-col gap-1.5">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-foreground">{s.label}</span>
            <span className="text-muted-foreground ml-auto">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SimpleLineChart({ data, labelKey, valueKey }: { data: any[]; labelKey: string; valueKey: string }) {
  const { t } = useTranslation();
  if (!data.length) return <p className="text-sm text-muted-foreground text-center py-8">{t('common.noData')}</p>;
  const max = Math.max(...data.map(d => d[valueKey]), 1);
  const w = 400, h = 160, px = 10, py = 10;
  const plotW = w - 2 * px, plotH = h - 2 * py;

  const points = data.map((d, i) => ({
    x: px + (data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW),
    y: py + plotH - (d[valueKey] / max) * plotH,
    label: d[labelKey],
    value: d[valueKey],
  }));

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaD = pathD + ` L${points[points.length - 1].x},${h - py} L${points[0].x},${h - py} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-44">
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#lineGrad)" />
      <path d={pathD} fill="none" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill="var(--color-primary)" />
          <text x={p.x} y={h - 2} textAnchor="middle" className="text-[8px] fill-muted-foreground">{p.label?.slice(-5)}</text>
          <text x={p.x} y={p.y - 8} textAnchor="middle" className="text-[9px] fill-foreground font-semibold">{p.value}</text>
        </g>
      ))}
    </svg>
  );
}

export default function Statistics() {
  const { t } = useTranslation();
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [ranking, setRanking] = useState<ParticipantsRankingResponse | null>(null);
  const [selectedParticipant, setSelectedParticipant] = useState<ParticipantDetailStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('wins');
  const [tab, setTab] = useState<'overview' | 'participants' | 'tournaments'>('overview');
  const [tournamentStats, setTournamentStats] = useState<any>(null);

  const rangeParams = useMemo<DateRangeParams>(() => {
    if (activePreset) return { preset: activePreset as any };
    const p: DateRangeParams = {};
    if (startDate) p.start_date = startDate;
    if (endDate) p.end_date = endDate;
    return p;
  }, [activePreset, startDate, endDate]);

  useEffect(() => {
    loadData();
  }, [rangeParams, sortBy]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ov, rk] = await Promise.all([
        statisticsService.getOverview(rangeParams),
        statisticsService.getParticipantsRanking(rangeParams, sortBy, 50),
      ]);
      setOverview(ov);
      setRanking(rk);
    } catch {
      /* ignore */
    }
    setLoading(false);
  };

  const loadTournamentStats = async () => {
    try {
      const ts = await statisticsService.getTournamentStats(rangeParams);
      setTournamentStats(ts);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (tab === 'tournaments' && !tournamentStats) {
      loadTournamentStats();
    }
  }, [tab]);

  useEffect(() => {
    if (tab === 'tournaments') {
      loadTournamentStats();
    }
  }, [rangeParams]);

  const loadParticipantDetail = async (id: number) => {
    try {
      const d = await statisticsService.getParticipantDetail(id, rangeParams);
      setSelectedParticipant(d);
    } catch {
      /* ignore */
    }
  };

  const handlePreset = (preset: string) => {
    setActivePreset(activePreset === preset ? null : preset);
    setStartDate('');
    setEndDate('');
  };

  const handleDateChange = (field: 'start' | 'end', value: string) => {
    setActivePreset(null);
    if (field === 'start') setStartDate(value);
    else setEndDate(value);
  };

  const pieData = useMemo(() => {
    if (!overview) return [];
    return overview.tournaments_by_mode.map((m, i) => ({
      label: MODE_KEYS[m.mode] ? t(MODE_KEYS[m.mode]) : m.mode,
      value: m.count,
      color: PIE_COLORS[i % PIE_COLORS.length],
    }));
  }, [overview, t]);

  if (loading && !overview) {
    return <div className="p-8 text-foreground">{t('common.loading')}</div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-foreground m-0">{t('statistics.title')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('statistics.subtitle')}</p>
      </div>

      {/* Filter */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Funnel size={18} className="text-muted-foreground" />
            <span className="text-sm font-medium text-foreground mr-2">{t('statistics.period')}</span>
            {PRESETS.map((p) => (
              <button
                key={p.value}
                onClick={() => handlePreset(p.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                  activePreset === p.value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-foreground border-border hover:border-primary'
                }`}
              >
                {p.label}
              </button>
            ))}
            <div className="h-5 w-px bg-border mx-1" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => handleDateChange('start', e.target.value)}
              className="px-2 py-1.5 text-xs rounded-md border border-border bg-background text-foreground"
              placeholder="Von"
            />
            <span className="text-muted-foreground text-xs">–</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => handleDateChange('end', e.target.value)}
              className="px-2 py-1.5 text-xs rounded-md border border-border bg-background text-foreground"
              placeholder="Bis"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border">
        {(['overview', 'participants', 'tournaments'] as const).map((tabKey) => (
          <button
            key={tabKey}
            onClick={() => setTab(tabKey)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === tabKey
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tabKey === 'overview' ? t('statistics.tabOverview') : tabKey === 'participants' ? t('statistics.tabParticipants') : t('statistics.tabTournaments')}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && overview && (
        <>
          {/* Stat Tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <StatTile icon={<Trophy size={28} weight="fill" className="text-primary" />} label={t('statistics.tournaments')} value={overview.tournaments_count} />
            <StatTile icon={<SoccerBall size={28} weight="fill" className="text-info" />} label={t('statistics.matches')} value={overview.matches_count} />
            <StatTile icon={<Users size={28} weight="fill" className="text-success" />} label={t('statistics.participants')} value={overview.participants_count} />
            <StatTile icon={<MapPin size={28} weight="fill" className="text-warning" />} label={t('statistics.locations')} value={overview.locations_count} />
          </div>

          {/* Status Tiles */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-foreground">{overview.completed_tournaments}</div>
                <div className="text-xs text-muted-foreground mt-1">{t('statistics.completed')}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-foreground">{overview.running_tournaments}</div>
                <div className="text-xs text-muted-foreground mt-1">{t('statistics.running')}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-foreground">{overview.planned_tournaments}</div>
                <div className="text-xs text-muted-foreground mt-1">{t('statistics.planned')}</div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Calendar size={16} /> {t('statistics.tournamentsPerMonth')}
                </h3>
                <SimpleBarChart data={overview.tournaments_by_month} labelKey="month" valueKey="count" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Trophy size={16} /> {t('statistics.tournamentsByMode')}
                </h3>
                <SimplePieChart data={pieData} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <SoccerBall size={16} /> {t('statistics.matchesPerMonth')}
              </h3>
              <SimpleLineChart data={overview.matches_by_month} labelKey="month" valueKey="count" />
            </CardContent>
          </Card>
        </>
      )}

      {/* Participants Ranking Tab */}
      {tab === 'participants' && ranking && (
        <>
          {selectedParticipant ? (
            <ParticipantDetail data={selectedParticipant} onBack={() => setSelectedParticipant(null)} />
          ) : (
            <>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-sm text-muted-foreground">{t('statistics.sortBy')}</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-2 py-1 text-xs rounded-md border border-border bg-background text-foreground"
                >
                  <option value="wins">{t('statistics.sortWins')}</option>
                  <option value="matches_played">{t('statistics.sortMatches')}</option>
                  <option value="goals_for">{t('statistics.sortGoals')}</option>
                  <option value="win_rate">{t('statistics.sortWinRate')}</option>
                  <option value="tournaments_count">{t('statistics.sortTournaments')}</option>
                </select>
                <span className="text-xs text-muted-foreground ml-auto">{t('statistics.totalParticipants', { count: ranking.total })}</span>
              </div>
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/50">
                          <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground">#</th>
                          <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground">{t('common.name')}</th>
                          <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground">{t('common.table.club')}</th>
                          <th className="text-center py-2.5 px-3 font-semibold text-muted-foreground">{t('common.table.tournaments')}</th>
                          <th className="text-center py-2.5 px-3 font-semibold text-muted-foreground">{t('common.table.games')}</th>
                          <th className="text-center py-2.5 px-3 font-semibold text-muted-foreground">{t('common.table.wins')}</th>
                          <th className="text-center py-2.5 px-3 font-semibold text-muted-foreground">{t('common.table.draws')}</th>
                          <th className="text-center py-2.5 px-3 font-semibold text-muted-foreground">{t('common.table.losses')}</th>
                          <th className="text-center py-2.5 px-3 font-semibold text-muted-foreground">{t('common.table.goals')}</th>
                          <th className="text-center py-2.5 px-3 font-semibold text-muted-foreground">{t('common.table.diff')}</th>
                          <th className="text-center py-2.5 px-3 font-semibold text-muted-foreground">{t('common.table.winRate')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ranking.participants.map((p, i) => (
                          <tr
                            key={p.id}
                            onClick={() => loadParticipantDetail(p.id)}
                            className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                          >
                            <td className="py-2 px-3 text-muted-foreground">{i + 1}</td>
                            <td className="py-2 px-3 font-medium text-foreground">{p.first_name} {p.last_name}</td>
                            <td className="py-2 px-3 text-muted-foreground">{p.club || '–'}</td>
                            <td className="py-2 px-3 text-center">{p.tournaments_count}</td>
                            <td className="py-2 px-3 text-center">{p.matches_played}</td>
                            <td className="py-2 px-3 text-center text-success font-medium">{p.wins}</td>
                            <td className="py-2 px-3 text-center text-muted-foreground">{p.draws}</td>
                            <td className="py-2 px-3 text-center text-destructive">{p.losses}</td>
                            <td className="py-2 px-3 text-center">{p.goals_for}:{p.goals_against}</td>
                            <td className="py-2 px-3 text-center">
                              <DiffBadge value={p.goal_difference} />
                            </td>
                            <td className="py-2 px-3 text-center font-medium">{p.win_rate}%</td>
                          </tr>
                        ))}
                        {ranking.participants.length === 0 && (
                          <tr>
                            <td colSpan={11} className="py-8 text-center text-muted-foreground">
                              {t('statistics.noParticipantsInPeriod')}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}

      {/* Tournament Stats Tab */}
      {tab === 'tournaments' && tournamentStats && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground">{t('statistics.table.tournament')}</th>
                    <th className="text-center py-2.5 px-3 font-semibold text-muted-foreground">{t('statistics.table.date')}</th>
                    <th className="text-center py-2.5 px-3 font-semibold text-muted-foreground">{t('statistics.table.mode')}</th>
                    <th className="text-center py-2.5 px-3 font-semibold text-muted-foreground">{t('statistics.table.status')}</th>
                    <th className="text-center py-2.5 px-3 font-semibold text-muted-foreground">{t('statistics.table.tn')}</th>
                    <th className="text-center py-2.5 px-3 font-semibold text-muted-foreground">{t('statistics.table.matches')}</th>
                    <th className="text-center py-2.5 px-3 font-semibold text-muted-foreground">{t('statistics.table.played')}</th>
                    <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground">{t('statistics.table.location')}</th>
                  </tr>
                </thead>
                <tbody>
                  {tournamentStats.tournaments.map((tourney: any) => (
                    <tr key={tourney.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="py-2 px-3 font-medium text-foreground">{tourney.name}</td>
                      <td className="py-2 px-3 text-center text-muted-foreground">{tourney.start_date}</td>
                      <td className="py-2 px-3 text-center">
                        <span className="px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground">
                          {MODE_KEYS[tourney.mode] ? t(MODE_KEYS[tourney.mode]) : tourney.mode}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <StatusBadge status={tourney.status} />
                      </td>
                      <td className="py-2 px-3 text-center">{tourney.participants_count}</td>
                      <td className="py-2 px-3 text-center">{tourney.total_matches}</td>
                      <td className="py-2 px-3 text-center">{tourney.completed_matches}/{tourney.total_matches}</td>
                      <td className="py-2 px-3 text-muted-foreground">{tourney.location_name || '–'}</td>
                    </tr>
                  ))}
                  {tournamentStats.tournaments.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-muted-foreground">
                        {t('statistics.noTournamentsInPeriod')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ---- Helper Components ---- */

function StatTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        {icon}
        <div>
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="text-3xl font-bold text-foreground">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function DiffBadge({ value }: { value: number }) {
  if (value > 0) return <span className="text-success font-medium flex items-center justify-center gap-0.5"><ArrowUp size={12} />+{value}</span>;
  if (value < 0) return <span className="text-destructive font-medium flex items-center justify-center gap-0.5"><ArrowDown size={12} />{value}</span>;
  return <span className="text-muted-foreground flex items-center justify-center gap-0.5"><Minus size={12} />0</span>;
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const cls =
    status === 'completed'
      ? 'bg-success/15 text-success'
      : status === 'running'
      ? 'bg-warning/15 text-warning'
      : 'bg-info/15 text-info';
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{STATUS_KEYS[status] ? t(STATUS_KEYS[status]) : status}</span>;
}

function ParticipantDetail({ data, onBack }: { data: ParticipantDetailStats; onBack: () => void }) {
  const { t } = useTranslation();
  return (
    <div>
      <button onClick={onBack} className="mb-4 text-sm text-primary hover:underline cursor-pointer bg-transparent border-none">
        &larr; {t('statistics.backToRanking')}
      </button>
      <Card className="mb-6">
        <CardContent className="p-5">
          <h3 className="text-lg font-semibold text-foreground mb-1">
            {data.first_name} {data.last_name}
          </h3>
          {data.club && <p className="text-sm text-muted-foreground mb-4">{data.club}</p>}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MiniStat label={t('statistics.miniStat.tournaments')} value={data.tournaments_count} />
            <MiniStat label={t('statistics.miniStat.matches')} value={data.matches_played} />
            <MiniStat label={t('statistics.miniStat.wins')} value={data.wins} className="text-success" />
            <MiniStat label={t('statistics.miniStat.winRate')} value={`${data.win_rate}%`} />
            <MiniStat label={t('statistics.miniStat.draws')} value={data.draws} />
            <MiniStat label={t('statistics.miniStat.losses')} value={data.losses} className="text-destructive" />
            <MiniStat label={t('statistics.miniStat.goals')} value={`${data.goals_for}:${data.goals_against}`} />
            <MiniStat label={t('statistics.miniStat.diff')} value={data.goal_difference > 0 ? `+${data.goal_difference}` : data.goal_difference} />
          </div>
        </CardContent>
      </Card>
      <h4 className="text-sm font-semibold text-foreground mb-3">{t('statistics.tournamentHistory')}</h4>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground">{t('statistics.table.tournament')}</th>
                  <th className="text-center py-2.5 px-3 font-semibold text-muted-foreground">{t('statistics.table.date')}</th>
                  <th className="text-center py-2.5 px-3 font-semibold text-muted-foreground">{t('common.table.games')}</th>
                  <th className="text-center py-2.5 px-3 font-semibold text-muted-foreground">{t('common.table.wins')}</th>
                  <th className="text-center py-2.5 px-3 font-semibold text-muted-foreground">{t('common.table.draws')}</th>
                  <th className="text-center py-2.5 px-3 font-semibold text-muted-foreground">{t('common.table.losses')}</th>
                  <th className="text-center py-2.5 px-3 font-semibold text-muted-foreground">{t('common.table.goals')}</th>
                </tr>
              </thead>
              <tbody>
                {data.tournament_history.map((h) => (
                  <tr key={h.tournament_id} className="border-b border-border last:border-0">
                    <td className="py-2 px-3 font-medium text-foreground">{h.tournament_name}</td>
                    <td className="py-2 px-3 text-center text-muted-foreground">{h.start_date}</td>
                    <td className="py-2 px-3 text-center">{h.matches_played}</td>
                    <td className="py-2 px-3 text-center text-success">{h.wins}</td>
                    <td className="py-2 px-3 text-center text-muted-foreground">{h.draws}</td>
                    <td className="py-2 px-3 text-center text-destructive">{h.losses}</td>
                    <td className="py-2 px-3 text-center">{h.goals_for}:{h.goals_against}</td>
                  </tr>
                ))}
                {data.tournament_history.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-muted-foreground">{t('statistics.noHistory')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MiniStat({ label, value, className = '' }: { label: string; value: string | number; className?: string }) {
  return (
    <div className="text-center">
      <div className={`text-xl font-bold ${className || 'text-foreground'}`}>{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}
