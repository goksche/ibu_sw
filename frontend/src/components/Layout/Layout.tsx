// Layout Component with Header
import { ReactNode } from 'react';
import Header from './Header';
import { theme } from '../../theme/theme';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: theme.colors.background.primary,
        color: theme.colors.text.primary,
      }}
    >
      <Header />
      <main
        style={{
          padding: '2rem',
          maxWidth: '1400px',
          margin: '0 auto',
        }}
      >
        {children}
      </main>
    </div>
  );
}
