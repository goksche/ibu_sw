import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
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
import { useAuth } from './contexts/AuthContext';

// BASE_PATH für Plattform-Integration (für React Router basename)
function getBasePath(): string {
  // Prüfe ob BASE_PATH bereits gesetzt ist (wird von der Plattform gesetzt)
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
  const { isAuthenticated, loading, canEdit, isAdmin } = useAuth();
  const basename = getBasePath();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh' 
      }}>
        <div>Lädt...</div>
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
      <Routes>
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
          path="/dashboard" 
          element={
            isAuthenticated ? (
              <Dashboard />
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
        <Route 
          path="/tournaments/create" 
          element={
            isAuthenticated && canEdit ? (
              <CreateTournament />
            ) : isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
        <Route
          path="/leagues"
          element={
            isAuthenticated ? (
              <Leagues />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/leagues/create"
          element={
            isAuthenticated && canEdit ? (
              <CreateLeague />
            ) : isAuthenticated ? (
              <Navigate to="/leagues" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/leagues/:id"
          element={
            isAuthenticated ? (
              <LeagueDetail />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/leagues/:id/edit"
          element={
            isAuthenticated && canEdit ? (
              <EditLeague />
            ) : isAuthenticated ? (
              <Navigate to="/leagues" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/locations"
          element={
            isAuthenticated ? (
              <Locations />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/locations/create"
          element={
            isAuthenticated && canEdit ? (
              <CreateLocation />
            ) : isAuthenticated ? (
              <Navigate to="/locations" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/locations/:id"
          element={
            isAuthenticated ? (
              <LocationDetail />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/locations/:id/edit"
          element={
            isAuthenticated && canEdit ? (
              <EditLocation />
            ) : isAuthenticated ? (
              <Navigate to="/locations" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route 
          path="/participants" 
          element={
            isAuthenticated ? (
              <Participants />
            ) : (
              <Navigate to="/login" replace />
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
        <Route 
          path="/tournaments/:id" 
          element={
            isAuthenticated ? (
              <TournamentDetail />
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
        <Route 
          path="/tournaments/:id/edit" 
          element={
            isAuthenticated && canEdit ? (
              <EditTournament />
            ) : isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
        <Route
          path="/admin/users"
          element={
            isAuthenticated && isAdmin ? (
              <UserManagement />
            ) : (
              <Navigate to="/dashboard" replace />
            )
          }
        />
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard" replace />
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

