// Platform Core App - Main Router
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import PlatformDashboard from './pages/PlatformDashboard';
import Login from './pages/Login';
import UserManagement from './pages/Admin/UserManagement';
import AppManagement from './pages/Admin/AppManagement';
import { authService } from './services/authService';

function App() {
  return (
    <Router 
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        
        {/* Protected Routes */}
        <Route 
          path="/" 
          element={
            authService.isAuthenticated() ? (
              <PlatformDashboard />
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
        
        {/* Admin Routes */}
        <Route 
          path="/admin/users" 
          element={
            authService.isAuthenticated() ? (
              <UserManagement />
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
        <Route 
          path="/admin/apps" 
          element={
            authService.isAuthenticated() ? (
              <AppManagement />
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;


