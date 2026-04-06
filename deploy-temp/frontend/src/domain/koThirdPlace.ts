import type { KOStructure } from '../types';

/** Struktur beinhaltet Spiel um Platz 3 per Definition (Modusvariante K5) */
export function koStructureIncludesThirdPlace(structure: KOStructure | null): boolean {
  return structure === 'single_elimination_with_third';
}
