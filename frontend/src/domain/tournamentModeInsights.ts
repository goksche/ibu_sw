import { MODE_VARIANTS, TournamentModeVariant } from './tournamentModeMatrix';

type ModeFamily = 'L' | 'K' | 'C';

export interface ModeVariantInsight {
  id: TournamentModeVariant;
  family: ModeFamily;
  title: string;
  intro: string;
  bullets: string[];
  flow: Array<{
    title: string;
    steps: string[];
  }>;
  visual: {
    familyLabel: string;
    palette: string[];
    stateLegend: string[];
  };
  wiki: {
    purpose: string;
    format: string;
    pros: string[];
    cons: string[];
    bestFor: string[];
    participantScale: {
      min: number;
      recommended: string;
    };
  };
}

function normalizeTitle(raw: string): string {
  return raw.replace(/^[LKC]\d+\s*/, '').trim();
}

function familyFromId(id: TournamentModeVariant): ModeFamily {
  return id.charAt(0) as ModeFamily;
}

function familyLabel(family: ModeFamily): string {
  if (family === 'L') return 'Liga';
  if (family === 'K') return 'KO';
  return 'Kombi';
}

const DEFAULT_LEGEND = ['Winner', 'Loser', 'TBD'];

export const MODE_VARIANT_INSIGHTS: Record<TournamentModeVariant, ModeVariantInsight> = Object.fromEntries(
  MODE_VARIANTS.map((item) => {
    const family = familyFromId(item.id);
    const insight: ModeVariantInsight = {
      id: item.id,
      family,
      title: normalizeTitle(item.title),
      intro: item.description,
      bullets: [
        'Regelwerk gemaess Modusvariante',
        'Klare Fortschrittslogik je Phase',
        'Bewertung und Rangfolge transparent',
      ],
      flow: [
        {
          title: 'Setup',
          steps: ['Teilnehmer setzen', 'Paarungs- bzw. Gruppenlogik festlegen'],
        },
        {
          title: 'Durchfuehrung',
          steps: ['Spiele erfassen', 'Zwischenstand aktualisieren'],
        },
        {
          title: 'Abschluss',
          steps: ['Rangfolge bilden', 'Qualifikation/Finale bestimmen'],
        },
      ],
      visual: {
        familyLabel: familyLabel(family),
        palette:
          family === 'L'
            ? ['emerald', 'slate']
            : family === 'K'
              ? ['rose', 'amber']
              : ['blue', 'emerald', 'rose'],
        stateLegend: DEFAULT_LEGEND,
      },
      wiki: {
        purpose: item.description,
        format: item.title,
        pros: ['Gute Vergleichbarkeit', 'Klare Struktur'],
        cons: ['Abhaengig von Teilnehmerzahl', 'Planungsaufwand variiert'],
        bestFor: ['Standardturniere', 'Transparente Wettbewerbe'],
        participantScale: {
          min: 4,
          recommended: '8-32 Teams',
        },
      },
    };
    return [item.id, insight];
  })
) as Record<TournamentModeVariant, ModeVariantInsight>;

export function getModeVariantInsight(variant?: string | null): ModeVariantInsight {
  if (variant && isTournamentModeVariant(variant)) {
    return MODE_VARIANT_INSIGHTS[variant];
  }
  return MODE_VARIANT_INSIGHTS.L1;
}

export function getAllModeVariantInsights(): ModeVariantInsight[] {
  return MODE_VARIANT_INSIGHTS ? Object.values(MODE_VARIANT_INSIGHTS) : [];
}

export function getModeVariantInsightsByFamily(family: ModeFamily): ModeVariantInsight[] {
  return getAllModeVariantInsights().filter((entry) => entry.family === family);
}

export function isTournamentModeVariant(value: string): value is TournamentModeVariant {
  return value in MODE_VARIANT_INSIGHTS;
}
