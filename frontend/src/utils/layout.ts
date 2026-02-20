const ALLOWED_LAYOUTS = new Set(['standard', 'neon', 'neon_yellow', 'neon_cyan', 'neon_blue']);

export const applyLayoutPreset = (layout?: string | null) => {
  if (typeof document === 'undefined') return;
  const normalized = layout && ALLOWED_LAYOUTS.has(layout) ? layout : 'standard';
  document.documentElement.dataset.layout = normalized;
};
