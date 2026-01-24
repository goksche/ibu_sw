import React from 'react';
import { theme } from '../../theme/theme';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea: React.FC<TextareaProps> = ({
  label,
  error,
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
      <textarea
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
          resize: 'vertical',
          fontFamily: 'inherit',
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
      />
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


