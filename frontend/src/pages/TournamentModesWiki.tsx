import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '../components/ui';
import {
  getAllModeVariantInsights,
  ModeVariantInsight,
} from '../domain/tournamentModeInsights';
import TournamentModeDiagram from '../components/tournament/TournamentModeDiagram';

const FAMILY_LABELS: Record<'all' | 'L' | 'K' | 'C', string> = {
  all: 'Alle',
  L: 'Liga-Modi',
  K: 'KO-Modi',
  C: 'Kombi-Modi',
};

const FAMILY_SECTION: Record<'L' | 'K' | 'C', { tag: string; name: string; cardClass: string }> = {
  L: { tag: 'Liga-Modi', name: 'Rundensysteme', cardClass: 'border-emerald-500/30 hover:shadow-[4px_4px_0_rgba(16,185,129,0.22)]' },
  K: { tag: 'KO-Modi', name: 'Eliminationssysteme', cardClass: 'border-rose-500/30 hover:shadow-[4px_4px_0_rgba(244,63,94,0.22)]' },
  C: { tag: 'Kombi-Modi', name: 'Kombinierte Systeme', cardClass: 'border-blue-500/30 hover:shadow-[4px_4px_0_rgba(59,130,246,0.22)]' },
};

function sectionTagClass(family: 'L' | 'K' | 'C'): string {
  if (family === 'L') return 'bg-emerald-500 text-white';
  if (family === 'K') return 'bg-rose-500 text-white';
  return 'bg-blue-500 text-white';
}

function modeIdClass(family: 'L' | 'K' | 'C'): string {
  if (family === 'L') return 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200';
  if (family === 'K') return 'border border-rose-500/40 bg-rose-500/10 text-rose-800 dark:text-rose-200';
  return 'border border-blue-500/40 bg-blue-500/10 text-blue-800 dark:text-blue-200';
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border bg-background p-2.5">
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className="text-xs leading-relaxed text-foreground">{value}</div>
    </div>
  );
}

function renderCardPills(insight: ModeVariantInsight): string[] {
  const firstPro = insight.wiki.pros[0] ?? 'Vorteil';
  const firstCon = insight.wiki.cons[0] ?? 'Trade-off';
  return [insight.wiki.format, firstPro, firstCon];
}

function needsWideCard(variant: string): boolean {
  return ['K3', 'K4', 'C3', 'C4', 'C5'].includes(variant);
}

function needsLargeDiagram(variant: string): boolean {
  return ['K3', 'K4', 'C3', 'C4', 'C5'].includes(variant);
}

function Section({
  family,
  insights,
}: {
  family: 'L' | 'K' | 'C';
  insights: ModeVariantInsight[];
}) {
  if (!insights.length) return null;

  return (
    <section className="mb-10">
      <div className="mb-5 flex items-center gap-3 border-b-2 border-border pb-3">
        <span className={`rounded px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${sectionTagClass(family)}`}>
          {FAMILY_SECTION[family].tag}
        </span>
        <span className="text-xl font-extrabold text-foreground">{FAMILY_SECTION[family].name}</span>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {insights.map((insight) => (
          <Card
            key={insight.id}
            className={`overflow-hidden border-2 bg-card transition-shadow ${FAMILY_SECTION[family].cardClass} ${
              needsWideCard(insight.id) ? 'md:col-span-2 xl:col-span-2' : ''
            }`}
          >
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
              <span className={`rounded px-2.5 py-1 text-xs font-bold tracking-[0.05em] ${modeIdClass(family)}`}>{insight.id}</span>
              <span className="text-sm font-semibold text-foreground">{insight.title}</span>
            </div>

            <div className="border-b border-border bg-muted/35 p-3">
              <TournamentModeDiagram variant={insight.id} size={needsLargeDiagram(insight.id) ? 'lg' : 'sm'} />
            </div>

            <div className="flex flex-wrap gap-1.5 border-b border-border px-4 py-3">
              {renderCardPills(insight).map((pill, idx) => (
                <span key={`${insight.id}-${idx}`} className="rounded border border-border bg-muted/30 px-2 py-0.5 text-[10px] text-muted-foreground">
                  {pill}
                </span>
              ))}
            </div>

            <div className="space-y-4 px-4 py-4">
              <p className="text-xs leading-relaxed text-muted-foreground">{insight.wiki.purpose}</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <InfoBlock label="Format" value={insight.wiki.format} />
                <InfoBlock label="Skalierung" value={`ab ${insight.wiki.participantScale.min}, empfohlen ${insight.wiki.participantScale.recommended}`} />
                <InfoBlock label="Vorteile" value={insight.wiki.pros.slice(0, 2).join(' | ')} />
                <InfoBlock label="Nachteile" value={insight.wiki.cons.slice(0, 2).join(' | ')} />
              </div>

              <div>
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Typische Anwendung</div>
                <div className="space-y-1">
                  {insight.wiki.bestFor.map((item) => (
                    <div key={item} className="text-xs text-muted-foreground">
                      - {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

export default function TournamentModesWiki() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const familyRaw = searchParams.get('family');
  const selectedFamily: 'all' | 'L' | 'K' | 'C' =
    familyRaw === 'L' || familyRaw === 'K' || familyRaw === 'C' ? familyRaw : 'all';

  const allInsights = getAllModeVariantInsights();
  const filteredInsights = useMemo(() => {
    if (selectedFamily === 'all') return allInsights;
    return allInsights.filter((item) => item.family === selectedFamily);
  }, [allInsights, selectedFamily]);

  const groupedInsights = useMemo(
    () => ({
      L: filteredInsights.filter((item) => item.family === 'L'),
      K: filteredInsights.filter((item) => item.family === 'K'),
      C: filteredInsights.filter((item) => item.family === 'C'),
    }),
    [filteredInsights]
  );

  return (
    <div className="w-full px-3 py-4 md:px-5 lg:px-6">
      <div className="mb-6 border-b-2 border-foreground/80 pb-4">
        <div className="mb-3 flex items-end justify-between gap-4">
          <h1 className="m-0 text-3xl font-extrabold tracking-tight text-foreground">Turniermodi</h1>
          <div className="text-right text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            FinalStage.ch · {allInsights.length} Modi · L1-L4 · K1-K6 · C1-C5
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">Visualisierung und Erklaerung im Design 2.0.</div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigate('/wiki')}
              className="rounded border border-border bg-background px-3 py-1.5 text-xs text-foreground hover:bg-muted"
            >
              Zur Wiki-Uebersicht
            </button>
            <button
              type="button"
              onClick={() => navigate('/tournaments/create')}
              className="rounded border border-border bg-background px-3 py-1.5 text-xs text-foreground hover:bg-muted"
            >
              Zur Turniererstellung
            </button>
          </div>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {(['all', 'L', 'K', 'C'] as const).map((family) => (
          <button
            key={family}
            type="button"
            onClick={() => {
              const next = new URLSearchParams(searchParams);
              next.set('family', family);
              setSearchParams(next);
            }}
            className={`rounded border px-3 py-1.5 text-xs uppercase tracking-[0.12em] ${
              selectedFamily === family
                ? 'border-foreground bg-foreground text-background'
                : 'border-border bg-background text-muted-foreground hover:bg-muted'
            }`}
          >
            {FAMILY_LABELS[family]}
          </button>
        ))}
      </div>

      <div className="mb-8 flex flex-wrap gap-3 text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
        <span className="inline-flex items-center gap-2 rounded border border-border px-2 py-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
          Sieg / Weiter
        </span>
        <span className="inline-flex items-center gap-2 rounded border border-border px-2 py-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-rose-500" />
          Niederlage / Aus
        </span>
        <span className="inline-flex items-center gap-2 rounded border border-border px-2 py-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-blue-500" />
          Winners Bracket
        </span>
        <span className="inline-flex items-center gap-2 rounded border border-border px-2 py-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" />
          Losers Bracket
        </span>
        <span className="inline-flex items-center gap-2 rounded border border-border px-2 py-1">
          <span className="h-2.5 w-2.5 rounded-sm border border-border bg-muted" />
          Noch offen / TBD
        </span>
      </div>

      <Section family="L" insights={groupedInsights.L} />
      <Section family="K" insights={groupedInsights.K} />
      <Section family="C" insights={groupedInsights.C} />
    </div>
  );
}
