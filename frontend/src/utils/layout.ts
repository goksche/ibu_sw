import { DEFAULT_THEME_ID, SELECTABLE_THEME_IDS, ThemeId } from '@/theme/themeRegistry';

const ALLOWED_LAYOUTS = new Set<string>(SELECTABLE_THEME_IDS);

export const applyLayoutPreset = (layout?: string | null) => {
  if (typeof document === 'undefined') return;
  const normalized = layout && ALLOWED_LAYOUTS.has(layout) ? layout : DEFAULT_THEME_ID;
  document.documentElement.dataset.layout = normalized;
};

export const isValidLayoutPreset = (layout?: string | null): layout is ThemeId =>
  typeof layout === 'string' && ALLOWED_LAYOUTS.has(layout);
