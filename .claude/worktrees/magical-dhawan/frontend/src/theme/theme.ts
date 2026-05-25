import { Theme } from './types';

export const theme: Theme = {
  colors: {
    background: {
      primary: 'var(--bg-primary)',
      secondary: 'var(--bg-secondary)',
      card: 'var(--bg-card)',
      accent: 'var(--bg-accent)',
    },
    text: {
      primary: 'var(--text-primary)',
      secondary: 'var(--text-secondary)',
      disabled: 'var(--text-disabled)',
    },
    accent: {
      primary: 'var(--accent-primary)',
      success: 'var(--accent-success)',
      warning: 'var(--accent-warning)',
      error: 'var(--accent-error)',
      info: 'var(--accent-info)',
    },
    border: {
      standard: 'var(--border-standard)',
      hover: 'var(--border-hover)',
      focus: 'var(--border-focus)',
    },
  },
  borderRadius: {
    button: '6px',
    input: '6px',
    card: '8px',
    badge: '6px',
    modal: '10px',
  },
  shadows: {
    card: '0 2px 8px rgba(15, 42, 68, 0.08)',
    buttonHover: '0 4px 12px rgba(15, 42, 68, 0.12)',
  },
  transitions: {
    default: 'all 0.2s ease',
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  },
};


