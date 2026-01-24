import { Theme } from './types';

export const theme: Theme = {
  colors: {
    background: {
      primary: '#000000', // Dunkel für gute Kontraste
      secondary: '#0a0a0a',
      card: '#1a1a1a',
      accent: '#2a2a2a',
    },
    text: {
      primary: '#ffffff',
      secondary: '#cccccc',
      disabled: '#666666',
    },
    accent: {
      primary: '#FFD700', // Akzentfarbe Gold
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#FFD700', // Gold statt Blau
    },
    border: {
      standard: '#333333',
      hover: '#FFD700', // Gold beim Hover
      focus: '#FFD700', // Gold beim Focus
    },
  },
  borderRadius: {
    button: '0px',
    input: '0px',
    card: '4px',
    badge: '0px',
    modal: '4px',
  },
  shadows: {
    card: '0 2px 8px rgba(0, 0, 0, 0.3)',
    buttonHover: '0 4px 12px rgba(76, 139, 245, 0.3)',
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


