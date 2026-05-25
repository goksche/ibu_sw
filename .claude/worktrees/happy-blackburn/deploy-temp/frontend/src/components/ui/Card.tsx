import React from 'react';
import { theme } from '../../theme/theme';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  padding?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  padding = '2rem',
  style,
  ...props
}) => {
  return (
    <div
      {...props}
      style={{
        background: theme.colors.background.card,
        border: `1px solid ${theme.colors.border.standard}`,
        borderRadius: theme.borderRadius.card,
        padding,
        boxShadow: theme.shadows.card,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

