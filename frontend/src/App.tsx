import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Tournaments from './pages/Tournaments';
import CreateTournament from './pages/CreateTournament';
import Participants from './pages/Participants';
import TournamentDetail from './pages/TournamentDetail';
import EditTournament from './pages/EditTournament';
import Leagues from './pages/Leagues';
import CreateLeague from './pages/CreateLeague';
import LeagueDetail from './pages/LeagueDetail';
import EditLeague from './pages/EditLeague';
import Locations from './pages/Locations';
import LiveTicker from './pages/LiveTicker';
import LocationDetail from './pages/LocationDetail';
import CreateLocation from './pages/CreateLocation';
import EditLocation from './pages/EditLocation';
import UserManagement from './pages/Admin/UserManagement';
import Logs from './pages/Admin/Logs';
import RegistrationManagement from './pages/Admin/RegistrationManagement';
import Settings from './pages/Settings';
import Register from './pages/Register';
import ProfileEdit from './pages/ProfileEdit';
import Profile from './pages/Profile';
import Statistics from './pages/Statistics';
import FeedbackPage from './pages/FeedbackPage';
import TournamentModesWiki from './pages/TournamentModesWiki';
import WikiOverview from './pages/WikiOverview';
import ParticipantMatchDialog from './components/ParticipantMatchDialog';
import Layout from './components/Layout/Layout';
import { useAuth } from './contexts/AuthContext';
import { logsService } from './services/logsService';
import { settingsService } from './services/settingsService';
import { applyLayoutPreset } from './utils/layout';
import { applyFontFamily, DEFAULT_FONT_FAMILY } from './utils/typography';

// BASE_PATH fuer Plattform-Integration (fuer React Router basename)
function getBasePath(): string {
  // Pruefe ob BASE_PATH bereits gesetzt ist (wird von der Plattform gesetzt)
  if (typeof window !== 'undefined' && (window as any).BASE_PATH) {
    return (window as any).BASE_PATH;
  }
  
  // Fallback: Extrahiere aus URL (z.B. /App-4/...)
  if (typeof window !== 'undefined') {
    const parts = window.location.pathname.split('/');
    if (parts.length > 1 && parts[1].startsWith('App-')) {
      return '/' + parts[1];
    }
  }
  
  // Lokale Entwicklung ohne Prefix
  return '';
}

function AppRoutes() {
  const { isAuthenticated, loading, canEdit, isAdmin, isPowerAdmin } = useAuth();
  const { t } = useTranslation();
  const basename = getBasePath();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      applyLayoutPreset('standard');
      applyFontFamily(DEFAULT_FONT_FAMILY);
      return;
    }

    const loadLayout = async () => {
      try {
        const userSettings = await settingsService.getUserSettings();
        applyLayoutPreset(userSettings.layout as any);
        applyFontFamily(userSettings.font_family as any);
      } catch {
        applyLayoutPreset('standard');
        applyFontFamily(DEFAULT_FONT_FAMILY);
      }
    };

    loadLayout();
  }, [isAuthenticated, loading]);

  const RouteTracker = () => {
    const location = useLocation();
    useEffect(() => {
      logsService.trackPageView({
        path: location.pathname,
        query: location.search || null,
        referrer: document.referrer || null,
        title: document.title || null
      });
    }, [location.pathname, location.search]);
    return null;
  };

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh' 
      }}>
        <div>{t('app.loading')}</div>
      </div>
    );
  }

  return (
    <Router 
      basename={basename}
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <RouteTracker />
      <Routes>
        {/* Fullscreen routes (no sidebar) */}
        <Route 
          path="/login" 
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Login />
            )
          } 
        />
        <Route
          path="/register"
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Register />
            )
          }
        />
        <Route
          path="/tournaments/:id/ticker"
          element={
            isAuthenticated ? (
              <LiveTicker />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Wiki: oeffentlich lesbar; mit Login inkl. Layout/Sidebar */}
        <Route
          path="/wiki"
          element={
            isAuthenticated ? (
              <Layout>
                <WikiOverview />
              </Layout>
            ) : (
              <WikiOverview />
            )
          }
        />
        <Route
          path="/wiki/modes"
          element={
            isAuthenticated ? (
              <Layout>
                <TournamentModesWiki />
              </Layout>
            ) : (
              <TournamentModesWiki />
            )
          }
        />

        {/* All other routes: wrapped in Layout with Sidebar */}
        <Route
          path="/*"
          element={
            isAuthenticated ? (
              <Layout>
                <ParticipantMatchDialog />
                <Routes>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/tournaments" element={<Tournaments />} />
                  <Route 
                    path="/tournaments/create" 
                    element={canEdit ? <CreateTournament /> : <Navigate to="/dashboard" replace />} 
                  />
                  <Route
                    path="/tournaments/create/wizard"
                    element={canEdit ? <CreateTournament /> : <Navigate to="/dashboard" replace />}
                  />
                  <Route path="/tournaments/:id" element={<TournamentDetail />} />
                  <Route 
                    path="/tournaments/:id/edit" 
                    element={canEdit ? <EditTournament /> : <Navigate to="/dashboard" replace />} 
                  />
                  <Route path="/leagues" element={<Leagues />} />
                  <Route 
                    path="/leagues/create" 
                    element={canEdit ? <CreateLeague /> : <Navigate to="/leagues" replace />} 
                  />
                  <Route
                    path="/leagues/create/wizard"
                    element={canEdit ? <CreateLeague /> : <Navigate to="/leagues" replace />}
                  />
                  <Route path="/leagues/:id" element={<LeagueDetail />} />
                  <Route 
                    path="/leagues/:id/edit" 
                    element={canEdit ? <EditLeague /> : <Navigate to="/leagues" replace />} 
                  />
                  <Route path="/locations" element={<Locations />} />
                  <Route 
                    path="/locations/create" 
                    element={canEdit ? <CreateLocation /> : <Navigate to="/locations" replace />} 
                  />
                  <Route path="/locations/:id" element={<LocationDetail />} />
                  <Route 
                    path="/locations/:id/edit" 
                    element={canEdit ? <EditLocation /> : <Navigate to="/locations" replace />} 
                  />
                  <Route path="/participants" element={<Participants />} />
                  <Route path="/statistics" element={<Statistics />} />
                  <Route path="/feedback" element={<FeedbackPage />} />
                  <Route
                    path="/admin/users"
                    element={isAdmin ? <UserManagement /> : <Navigate to="/dashboard" replace />}
                  />
                  <Route
                    path="/admin/logs"
                    element={isAdmin ? <Logs /> : <Navigate to="/dashboard" replace />}
                  />
                  <Route
                    path="/admin/registrations"
                    element={isPowerAdmin ? <RegistrationManagement /> : <Navigate to="/dashboard" replace />}
                  />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/profile/edit" element={<ProfileEdit />} />
                  <Route path="/profile/:id" element={<Profile />} />
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </Router>
  );
}

function App() {
  return <AppRoutes />;
}

export default App;
