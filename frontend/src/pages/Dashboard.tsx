// Dashboard Page - Uebersicht mit Statistik-Kacheln
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { tournamentService } from '../services/tournamentService';
import { leagueService } from '../services/leagueService';
import { infoService } from '../services/infoService';
import { Tournament, League } from '../types';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui';
import { Trophy, PlayCircle, CheckCircle, Calendar, ChartLine, MapPin, Users } from 'phosphor-react';

function getLeagueStatus(league: League): string {
  return league.status || 'geplant';
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [appVersion, setAppVersion] = useState('1.8.0');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    loadData();
  }, [isAuthenticated, navigate]);

  const loadData = async () => {
    try {
      const appInfo = await infoService.getVersion();
      if (appInfo?.version) {
        setAppVersion(appInfo.version);
      }
    } catch {
      // Keep fallback version when info endpoint is unavailable.
    }
    try {
      const tournamentsData = await tournamentService.getAll();
      setTournaments(tournamentsData);
    } catch {
      setTournaments([]);
    }
    try {
      const leaguesData = await leagueService.getAll();
      setLeagues(leaguesData);
    } catch {
      setLeagues([]);
    }
    setLoading(false);
  };

  const stats = {
    total: tournaments.length,
    running: tournaments.filter(tr => tr.status?.toLowerCase() === 'laufend' || tr.status?.toLowerCase() === 'running').length,
    completed: tournaments.filter(tr => tr.status?.toLowerCase() === 'abgeschlossen' || tr.status?.toLowerCase() === 'completed').length,
    planned: tournaments.filter(tr => tr.status?.toLowerCase() === 'geplant' || tr.status?.toLowerCase() === 'planned').length,
  };

  const leagueStatuses = leagues.map(l => getLeagueStatus(l));
  const leagueStats = {
    total: leagues.length,
    running: leagueStatuses.filter(s => s === 'laufend').length,
    completed: leagueStatuses.filter(s => s === 'abgeschlossen').length,
    planned: leagueStatuses.filter(s => s === 'geplant').length,
  };

  if (loading) return <div className="p-8 text-foreground">{t('common.loading')}</div>;

  const statCards = [
    { label: t('dashboard.tournamentsTotal'), value: stats.total, icon: <Trophy size={32} weight="fill" className="text-primary" />, link: '/tournaments' },
    { label: t('dashboard.running'), value: stats.running, icon: <PlayCircle size={32} weight="fill" className="text-warning" />, link: '/tournaments?status=laufend' },
    { label: t('dashboard.completed'), value: stats.completed, icon: <CheckCircle size={32} weight="fill" className="text-success" />, link: '/tournaments?status=abgeschlossen' },
    { label: t('dashboard.planned'), value: stats.planned, icon: <Calendar size={32} weight="fill" className="text-info" />, link: '/tournaments?status=geplant' },
  ];

  const leagueCards = [
    { label: t('dashboard.leaguesTotal'), value: leagueStats.total, icon: <ChartLine size={32} weight="fill" className="text-primary" />, link: '/leagues' },
    { label: t('dashboard.running'), value: leagueStats.running, icon: <PlayCircle size={32} weight="fill" className="text-warning" />, link: '/leagues?status=laufend' },
    { label: t('dashboard.completed'), value: leagueStats.completed, icon: <CheckCircle size={32} weight="fill" className="text-success" />, link: '/leagues?status=abgeschlossen' },
    { label: t('dashboard.planned'), value: leagueStats.planned, icon: <Calendar size={32} weight="fill" className="text-info" />, link: '/leagues?status=geplant' },
  ];

  const quickLinks = [
    { label: t('dashboard.tournaments'), icon: <Trophy size={28} weight="bold" />, link: '/tournaments' },
    { label: t('dashboard.leagues'), icon: <ChartLine size={28} weight="bold" />, link: '/leagues' },
    { label: t('dashboard.locations'), icon: <MapPin size={28} weight="bold" />, link: '/locations' },
    { label: t('dashboard.participants'), icon: <Users size={28} weight="bold" />, link: '/participants' },
  ];

  return (
    <div className="space-y-8 page-shell">
      <section className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">{t('dashboard.title')}</h1>
        <p className="text-muted-foreground">{t('dashboard.welcome', { version: appVersion })}</p>
      </section>

      {/* Turnier Statistics */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">{t('dashboard.tournaments')}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card
            key={card.label}
            className="arena-surface cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-primary hover:-translate-y-0.5"
            onClick={() => navigate(card.link)}
          >
            <CardContent className="flex items-center gap-4 p-6">
              {card.icon}
              <div>
                <div className="text-sm text-muted-foreground mb-1">{card.label}</div>
                <div className="text-3xl font-bold text-foreground">{card.value}</div>
              </div>
            </CardContent>
          </Card>
        ))}
        </div>
      </section>

      {/* Meisterschaft Statistics */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">{t('dashboard.leagues')}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {leagueCards.map((card) => (
          <Card
            key={card.label}
            className="arena-surface cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-primary hover:-translate-y-0.5"
            onClick={() => navigate(card.link)}
          >
            <CardContent className="flex items-center gap-4 p-6">
              {card.icon}
              <div>
                <div className="text-sm text-muted-foreground mb-1">{card.label}</div>
                <div className="text-3xl font-bold text-foreground">{card.value}</div>
              </div>
            </CardContent>
          </Card>
        ))}
        </div>
      </section>

      {/* Quick Navigation */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">{t('dashboard.quickAccess')}</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {quickLinks.map((item) => (
          <Card
            key={item.label}
            className="arena-surface cursor-pointer transition-all duration-200 hover:border-primary hover:-translate-y-0.5 hover:shadow-md text-center"
            onClick={() => navigate(item.link)}
          >
            <CardContent className="p-5">
              <div className="text-primary mb-2">{item.icon}</div>
              <div className="text-sm font-medium text-foreground">{item.label}</div>
            </CardContent>
          </Card>
        ))}
        </div>
      </section>
    </div>
  );
}

