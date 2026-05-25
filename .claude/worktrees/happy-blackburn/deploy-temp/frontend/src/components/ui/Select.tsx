import React from 'react';
import { theme } from '../../theme/theme';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{ value: string | number; label: string }>;
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  options,
  style,
  ...props
}) => {
  return (
    <div style={{ marginBottom: '1rem' }}>
      {label && (
        <label
          style={{
            display: 'block',
            marginBottom: theme.spacing.sm,
            color: theme.colors.text.primary,
            fontWeight: '500',
          }}
        >
          {label}
        </label>
      )}
      <select
        {...props}
        style={{
          width: '100%',
          padding: '0.75rem',
          fontSize: '1rem',
          background: theme.colors.background.secondary,
          color: theme.colors.text.primary,
          border: `1px solid ${error ? theme.colors.accent.error : theme.colors.border.standard}`,
          borderRadius: theme.borderRadius.input,
          outline: 'none',
          transition: theme.transitions.default,
          ...style,
        }}
        onFocus={(e) => {
          e.target.style.borderColor = theme.colors.border.focus;
          if (props.onFocus) {
            props.onFocus(e);
          }
        }}
        onBlur={(e) => {
          e.target.style.borderColor = error ? theme.colors.accent.error : theme.colors.border.standard;
          if (props.onBlur) {
            props.onBlur(e);
          }
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} style={{ background: theme.colors.background.secondary, color: theme.colors.text.primary }}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <div
          style={{
            marginTop: theme.spacing.xs,
            color: theme.colors.accent.error,
            fontSize: '0.875rem',
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
};

