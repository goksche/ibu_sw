import React from 'react';
import { theme } from '../../theme/theme';

export type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'default';

export interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  children,
  style,
}) => {
  const getVariantStyles = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      display: 'inline-block',
      padding: '0.25rem 0.75rem',
      borderRadius: theme.borderRadius.badge,
      fontSize: '0.875rem',
      fontWeight: '600',
    };

    switch (variant) {
      case 'success':
        return {
          ...baseStyle,
          background: `${theme.colors.accent.success}20`,
          color: theme.colors.accent.success,
          border: `1px solid ${theme.colors.accent.success}`,
        };
      case 'warning':
        return {
          ...baseStyle,
          background: `${theme.colors.accent.warning}20`,
          color: theme.colors.accent.warning,
          border: `1px solid ${theme.colors.accent.warning}`,
        };
      case 'error':
        return {
          ...baseStyle,
          background: `${theme.colors.accent.error}20`,
          color: theme.colors.accent.error,
          border: `1px solid ${theme.colors.accent.error}`,
        };
      case 'info':
        return {
          ...baseStyle,
          background: `${theme.colors.accent.info}20`,
          color: theme.colors.accent.info,
          border: `1px solid ${theme.colors.accent.info}`,
        };
      default:
        return {
          ...baseStyle,
          background: theme.colors.background.accent,
          color: theme.colors.text.secondary,
          border: `1px solid ${theme.colors.border.standard}`,
        };
    }
  };

  return (
    <span style={{ ...getVariantStyles(), ...style }}>
      {children}
    </span>
  );
};

