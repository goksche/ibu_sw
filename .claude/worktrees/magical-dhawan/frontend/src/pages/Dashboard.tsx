// Dashboard Page - Uebersicht mit Statistik-Kacheln
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { tournamentService } from '../services/tournamentService';
import { leagueService } from '../services/leagueService';
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
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const appVersion = '1.5.0 Beta';

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    loadData();
  }, [isAuthenticated, navigate]);

  const loadData = async () => {
    try {
      const [tournamentsData, leaguesData] = await Promise.all([
        tournamentService.getAll(),
        leagueService.getAll(),
      ]);
      setTournaments(tournamentsData);
      setLeagues(leaguesData);
    } catch {
      setTournaments([]);
      setLeagues([]);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    total: tournaments.length,
    running: tournaments.filter(t => t.status?.toLowerCase() === 'laufend' || t.status?.toLowerCase() === 'running').length,
    completed: tournaments.filter(t => t.status?.toLowerCase() === 'abgeschlossen' || t.status?.toLowerCase() === 'completed').length,
    planned: tournaments.filter(t => t.status?.toLowerCase() === 'geplant' || t.status?.toLowerCase() === 'planned').length,
  };

  const leagueStatuses = leagues.map(l => getLeagueStatus(l));
  const leagueStats = {
    total: leagues.length,
    running: leagueStatuses.filter(s => s === 'laufend').length,
    completed: leagueStatuses.filter(s => s === 'abgeschlossen').length,
    planned: leagueStatuses.filter(s => s === 'geplant').length,
  };

  if (loading) return <div className="p-8 text-foreground">Wird geladen...</div>;

  const statCards = [
    { label: 'Turniere gesamt', value: stats.total, icon: <Trophy size={32} weight="fill" className="text-primary" />, link: '/tournaments' },
    { label: 'Laufend', value: stats.running, icon: <PlayCircle size={32} weight="fill" className="text-warning" />, link: '/tournaments?status=laufend' },
    { label: 'Abgeschlossen', value: stats.completed, icon: <CheckCircle size={32} weight="fill" className="text-success" />, link: '/tournaments?status=abgeschlossen' },
    { label: 'Geplant', value: stats.planned, icon: <Calendar size={32} weight="fill" className="text-info" />, link: '/tournaments?status=geplant' },
  ];

  const leagueCards = [
    { label: 'Meisterschaften gesamt', value: leagueStats.total, icon: <ChartLine size={32} weight="fill" className="text-primary" />, link: '/leagues' },
    { label: 'Laufend', value: leagueStats.running, icon: <PlayCircle size={32} weight="fill" className="text-warning" />, link: '/leagues?status=laufend' },
    { label: 'Abgeschlossen', value: leagueStats.completed, icon: <CheckCircle size={32} weight="fill" className="text-success" />, link: '/leagues?status=abgeschlossen' },
    { label: 'Geplant', value: leagueStats.planned, icon: <Calendar size={32} weight="fill" className="text-info" />, link: '/leagues?status=geplant' },
  ];

  const quickLinks = [
    { label: 'Turniere', icon: <Trophy size={28} weight="bold" />, link: '/tournaments' },
    { label: 'Meisterschaften', icon: <ChartLine size={28} weight="bold" />, link: '/leagues' },
    { label: 'Spielorte', icon: <MapPin size={28} weight="bold" />, link: '/locations' },
    { label: 'Teilnehmer', icon: <Users size={28} weight="bold" />, link: '/participants' },
  ];

  return (
    <div>
      {/* Page Title */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-foreground m-0">Dashboard</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Willkommen bei FinalStage.ch — Version {appVersion}
        </p>
      </div>

      {/* Turnier Statistics */}
      <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
        <Trophy size={22} weight="bold" className="text-primary" />
        Turniere
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => (
          <Card
            key={card.label}
            className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-primary hover:-translate-y-0.5"
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

      {/* Meisterschaft Statistics */}
      <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
        <ChartLine size={22} weight="bold" className="text-primary" />
        Meisterschaften
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {leagueCards.map((card) => (
          <Card
            key={card.label}
            className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-primary hover:-translate-y-0.5"
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

      {/* Quick Navigation */}
      <h3 className="text-lg font-semibold text-foreground mb-4">Schnellzugriff</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {quickLinks.map((item) => (
          <Card
            key={item.label}
            className="cursor-pointer transition-all duration-200 hover:border-primary hover:-translate-y-0.5 hover:shadow-md text-center"
            onClick={() => navigate(item.link)}
          >
            <CardContent className="p-5">
              <div className="text-primary mb-2">{item.icon}</div>
              <div className="text-sm font-medium text-foreground">{item.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
