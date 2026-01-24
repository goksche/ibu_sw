// Header Component
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { SignOut } from 'phosphor-react';
import { theme } from '../../theme/theme';

export default function Header() {
  const navigate = useNavigate();
  const isAuthenticated = authService.isAuthenticated();

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  return (
    <header
      style={{
        background: theme.colors.background.primary,
        borderBottom: `2px solid ${theme.colors.accent.primary}`,
        padding: '1rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
      }}
    >
      <Link
        to="/"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          textDecoration: 'none',
          color: theme.colors.text.primary,
        }}
      >
        {/* Logo Placeholder */}
        <div
          style={{
            width: '48px',
            height: '48px',
            background: theme.colors.accent.primary,
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            fontSize: '24px',
            color: theme.colors.background.primary,
            border: `2px solid ${theme.colors.accent.primary}`,
          }}
        >
          IB
        </div>
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: theme.colors.text.primary,
              letterSpacing: '2px',
              fontFamily: 'Arial, sans-serif',
            }}
          >
            IBU Turniere
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: '0.75rem',
              color: theme.colors.text.secondary,
              letterSpacing: '1px',
            }}
          >
            Turnier-Verwaltung
          </p>
        </div>
      </Link>

      {isAuthenticated && (
        <button
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            background: 'transparent',
            border: `1px solid ${theme.colors.border.standard}`,
            color: theme.colors.text.primary,
            cursor: 'pointer',
            borderRadius: theme.borderRadius.button,
            transition: theme.transitions.default,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = theme.colors.accent.primary;
            e.currentTarget.style.color = theme.colors.accent.primary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = theme.colors.border.standard;
            e.currentTarget.style.color = theme.colors.text.primary;
          }}
        >
          <SignOut size={20} />
          <span>Logout</span>
        </button>
      )}
    </header>
  );
}
