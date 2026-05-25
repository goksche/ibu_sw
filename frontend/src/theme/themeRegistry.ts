export type ThemeId =
  | 'standard'
  | 'neon'
  | 'neon_yellow'
  | 'neon_cyan'
  | 'neon_blue'
  | 'arena'
  | 'gsmartsol';

export interface ThemeOption {
  id: ThemeId;
  label: string;
  description: string;
  selectableInSettings: boolean;
  stage: 'stable' | 'preview';
}

export const THEME_REGISTRY: ThemeOption[] = [
  {
    id: 'standard',
    label: 'Standard',
    description: 'Klassisches FinalStage-Theme',
    selectableInSettings: true,
    stage: 'stable',
  },
  {
    id: 'neon',
    label: 'NeonGreen',
    description: 'High-contrast Neon Grün',
    selectableInSettings: true,
    stage: 'stable',
  },
  {
    id: 'neon_yellow',
    label: 'NeonYellow',
    description: 'High-contrast Neon Gelb',
    selectableInSettings: true,
    stage: 'stable',
  },
  {
    id: 'neon_cyan',
    label: 'NeonCyan',
    description: 'High-contrast Neon Cyan',
    selectableInSettings: true,
    stage: 'stable',
  },
  {
    id: 'neon_blue',
    label: 'NeonBlue',
    description: 'High-contrast Neon Blau',
    selectableInSettings: true,
    stage: 'stable',
  },
  {
    id: 'arena',
    label: 'Design 2.0',
    description: 'Dark premium surfaces mit reduzierter visueller Lautstärke',
    selectableInSettings: true,
    stage: 'stable',
  },
  {
    id: 'gsmartsol',
    label: 'Gsmartsol',
    description: 'Design 3.0 mit dark/cyan Fokus',
    selectableInSettings: true,
    stage: 'stable',
  },
];

export const DEFAULT_THEME_ID: ThemeId = 'standard';

export const SELECTABLE_THEME_IDS = THEME_REGISTRY
  .filter((theme) => theme.selectableInSettings)
  .map((theme) => theme.id);
