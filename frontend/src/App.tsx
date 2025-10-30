import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CreateTournament from './pages/CreateTournament';
import Participants from './pages/Participants';
import { authService } from './services/authService';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route 
          path="/dashboard" 
          element={
            authService.isAuthenticated() ? (
              <Dashboard />
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
        <Route 
          path="/tournaments/create" 
          element={
            authService.isAuthenticated() ? (
              <CreateTournament />
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
        <Route 
          path="/participants" 
          element={
            authService.isAuthenticated() ? (
              <Participants />
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;

