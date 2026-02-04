// Footer Component - GSmartSol Copyright
import { theme } from '../theme/theme';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer
      style={{
        padding: '1rem 2rem',
        textAlign: 'center',
        color: theme.colors.text.secondary,
        fontSize: '0.875rem',
        borderTop: `1px solid ${theme.colors.border.standard}`,
        background: theme.colors.background.secondary,
        marginTop: 'auto',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      © {currentYear}{' '}
      <span style={{ fontWeight: '500', color: theme.colors.text.primary }}>
        GSmartSol
      </span>
      . Alle Rechte vorbehalten.
    </footer>
  );
}
