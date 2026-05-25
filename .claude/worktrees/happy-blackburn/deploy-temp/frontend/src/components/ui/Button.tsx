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
    };

    switch (variant) {
      case 'primary':
        return {
          ...baseStyle,
          background: disabled ? theme.colors.text.disabled : theme.colors.accent.primary,
          color: theme.colors.text.primary,
          borderColor: disabled ? theme.colors.text.disabled : theme.colors.accent.primary,
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
          color: theme.colors.text.primary,
          borderColor: disabled ? theme.colors.text.disabled : theme.colors.accent.warning,
        };
      case 'info':
        return {
          ...baseStyle,
          background: disabled ? theme.colors.text.disabled : theme.colors.accent.info,
          color: theme.colors.text.primary,
          borderColor: disabled ? theme.colors.text.disabled : theme.colors.accent.info,
        };
      default:
        return baseStyle;
    }
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled && variant === 'primary') {
      e.currentTarget.style.boxShadow = theme.shadows.buttonHover;
      e.currentTarget.style.background = '#3b82f6';
      e.currentTarget.style.borderColor = '#3b82f6';
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

