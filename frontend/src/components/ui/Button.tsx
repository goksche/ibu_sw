import React from 'react';
import { theme } from '../../theme/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'info';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  fullWidth = false,
  children,
  disabled,
  style,
  ...props
}) => {
  const getVariantStyles = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      padding: '0.75rem 1.5rem',
      border: `2px solid ${theme.colors.border.standard}`,
      borderRadius: theme.borderRadius.button,
      fontWeight: '600',
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: theme.transitions.default,
      opacity: disabled ? 0.6 : 1,
      width: fullWidth ? '100%' : 'auto',
      fontSize: '1rem',
      boxSizing: 'border-box',
      lineHeight: '1.5',
    };

    switch (variant) {
      case 'primary':
        return {
          ...baseStyle,
          background: disabled ? theme.colors.text.disabled : theme.colors.accent.primary,
          color: theme.colors.background.primary, // Schwarzer Text auf Gold
          borderColor: disabled ? theme.colors.text.disabled : theme.colors.accent.primary,
          fontWeight: '600',
        };
      case 'secondary':
        return {
          ...baseStyle,
          background: theme.colors.background.card,
          color: theme.colors.text.primary,
          borderColor: theme.colors.border.standard,
        };
      case 'danger':
        return {
          ...baseStyle,
          background: disabled ? theme.colors.text.disabled : theme.colors.accent.error,
          color: theme.colors.text.primary,
          borderColor: disabled ? theme.colors.text.disabled : theme.colors.accent.error,
        };
      case 'success':
        return {
          ...baseStyle,
          background: disabled ? theme.colors.text.disabled : theme.colors.accent.success,
          color: theme.colors.text.primary,
          borderColor: disabled ? theme.colors.text.disabled : theme.colors.accent.success,
        };
      case 'warning':
        return {
          ...baseStyle,
          background: disabled ? theme.colors.text.disabled : theme.colors.accent.warning,
          color: theme.colors.background.primary, // Schwarzer Text auf gelb/orange
          borderColor: disabled ? theme.colors.text.disabled : theme.colors.accent.warning,
          fontWeight: '600',
        };
      case 'info':
        return {
          ...baseStyle,
          background: disabled ? theme.colors.text.disabled : theme.colors.accent.info,
          color: theme.colors.background.primary, // Schwarzer Text auf Gold
          borderColor: disabled ? theme.colors.text.disabled : theme.colors.accent.info,
          fontWeight: '600',
        };
      default:
        return baseStyle;
    }
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled && variant === 'primary') {
      e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 215, 0, 0.4)';
      e.currentTarget.style.background = '#FFC700'; // Helleres Gold beim Hover
      e.currentTarget.style.borderColor = '#FFC700';
    } else if (!disabled && variant === 'secondary') {
      e.currentTarget.style.background = theme.colors.background.accent;
      e.currentTarget.style.borderColor = theme.colors.border.hover;
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled && variant === 'primary') {
      e.currentTarget.style.boxShadow = 'none';
      e.currentTarget.style.background = theme.colors.accent.primary;
      e.currentTarget.style.borderColor = theme.colors.accent.primary;
    } else if (!disabled && variant === 'secondary') {
      e.currentTarget.style.background = theme.colors.background.card;
      e.currentTarget.style.borderColor = theme.colors.border.standard;
    }
  };

  return (
    <button
      {...props}
      disabled={disabled}
      style={{
        ...getVariantStyles(),
        ...style,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </button>
  );
};


