import React from 'react';
import * as PhosphorIcons from 'phosphor-react';
import { theme } from '../../theme/theme';

export type IconName = keyof typeof PhosphorIcons;
export type IconWeight = 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone';

export interface IconProps {
  name: IconName;
  size?: number | string;
  weight?: IconWeight;
  color?: string;
  style?: React.CSSProperties;
}

export const Icon: React.FC<IconProps> = ({
  name,
  size = 20,
  weight = 'regular',
  color = theme.colors.text.primary,
  style,
}) => {
  const IconComponent = PhosphorIcons[name] as React.ComponentType<any>;

  if (!IconComponent) {
    console.warn(`Icon "${name}" not found in Phosphor Icons`);
    return null;
  }

  return (
    <IconComponent
      size={size}
      weight={weight}
      color={color}
      style={style}
    />
  );
};

// Helper function to get icon component
export const getIcon = (name: IconName) => {
  return PhosphorIcons[name] as React.ComponentType<any>;
};

