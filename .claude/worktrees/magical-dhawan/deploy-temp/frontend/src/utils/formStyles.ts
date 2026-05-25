import { theme } from '../theme/theme';

export const getInputStyle = (error?: boolean) => ({
  width: '100%' as const,
  padding: '0.75rem',
  fontSize: '1rem',
  background: theme.colors.background.secondary,
  color: theme.colors.text.primary,
  border: `1px solid ${error ? theme.colors.accent.error : theme.colors.border.standard}`,
  borderRadius: theme.borderRadius.input,
  outline: 'none' as const,
  transition: theme.transitions.default,
});

export const getLabelStyle = () => ({
  display: 'block' as const,
  marginBottom: theme.spacing.sm,
  fontWeight: 'bold' as const,
  color: theme.colors.text.primary,
});

export const getSelectStyle = (error?: boolean) => getInputStyle(error);

export const getTextareaStyle = (error?: boolean) => ({
  ...getInputStyle(error),
  resize: 'vertical' as const,
  fontFamily: 'inherit' as const,
});

