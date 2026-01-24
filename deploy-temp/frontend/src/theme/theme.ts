import { Theme } from './types';

export const theme: Theme = {
  colors: {
    background: {
      primary: '#0f0f0f',
      secondary: '#1a1a1a',
      card: '#242424',
      accent: '#2d2d2d',
    },
    text: {
      primary: '#ffffff',
      secondary: '#b3b3b3',
      disabled: '#666666',
    },
    accent: {
      primary: '#4c8bf5',
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
    },
    border: {
      standard: '#404040',
      hover: '#525252',
      focus: '#4c8bf5',
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

