const DEFAULT_FONT_FAMILY = 'Source Sans 3';

const FONT_FAMILY_MAP: Record<string, string> = {
  'Protest Guerilla': "'Protest Guerrilla', 'Inter', 'Arial', sans-serif",
  'Source Sans 3': "'Source Sans 3', 'Inter', 'Arial', sans-serif",
  Helvetica: "'Helvetica', 'Arial', sans-serif",
  Baskerville: "'Baskervville', 'Baskerville', 'Baskerville Old Face', 'Garamond', serif",
  Times: "'Tinos', 'Times New Roman', 'Times', serif",
  Gotham: "'Gotham', 'Arial', sans-serif",
  Bodoni: "'Bodoni Moda', 'Bodoni MT', 'Didot', serif",
  Didot: "'GFS Didot', 'Didot', 'Bodoni MT', serif",
  Rockwell: "'Rockwell', 'Rockwell Nova', 'Courier New', serif",
  Franklin: "'Franklin Gothic Medium', 'Franklin Gothic', 'Arial', sans-serif",
  Sabon: "'Sabon', 'Garamond', 'Times New Roman', serif",
  'News Gothic': "'News Gothic', 'Franklin Gothic', 'Arial', sans-serif",
  'Elliot Six': "'Elliot Six', 'Times New Roman', serif",
  Angelina: "'Angelina', 'Comic Sans MS', cursive",
  'Mushroom 6': "'Mushroom 6', 'Comic Sans MS', cursive",
  Rocksmith: "'Rocksmith', 'Arial', sans-serif",
  'The Doorman': "'The Doorman', 'Arial', sans-serif",
  Rampstar: "'Rampstar', 'Arial', sans-serif",
};

export const applyFontFamily = (fontFamily?: string | null) => {
  if (typeof document === 'undefined') return;
  const resolved = FONT_FAMILY_MAP[fontFamily || ''] || FONT_FAMILY_MAP[DEFAULT_FONT_FAMILY];
  document.documentElement.style.setProperty('--font-family-base', resolved);
};

export { DEFAULT_FONT_FAMILY, FONT_FAMILY_MAP };
