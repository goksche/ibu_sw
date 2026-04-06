import { cn } from '@/lib/utils';
import type { TournamentModeVariant } from '@/domain/tournamentModeMatrix';
import referenceHtml from '@/assets/turniermodi-mix.reference.html?raw';

interface TournamentModeDiagramProps {
  variant: TournamentModeVariant;
  size?: 'sm' | 'lg';
}

const SVG_STYLE = `
.mode-diagram-svg {
  --L: #16a34a;
  --L-bg: #eaf8ef;
  --L-mid: #b9e6c9;
  --K: #e11d48;
  --K-bg: #fef1f4;
  --K-mid: #fecdd8;
  --C: #2563eb;
  --C-bg: #eef4ff;
  --C-mid: #bfdbfe;
  --paper: #ffffff;
  --paper2: #f8fafc;
  --border: #d4d4d8;
  --ink: #18181b;
  --ink2: #3f3f46;
  --ink3: #71717a;
  aspect-ratio: 2 / 1;
}
.mode-diagram-svg .team-node { fill: var(--paper); stroke: var(--border); stroke-width: 1.5; }
.mode-diagram-svg .team-node.winner { fill: var(--L-bg); stroke: var(--L); }
.mode-diagram-svg .team-node.loser { fill: var(--K-bg); stroke: var(--K); }
.mode-diagram-svg .team-node.bye { fill: var(--paper2); stroke: var(--border); stroke-dasharray: 4 2; }
.mode-diagram-svg .team-node.tbd { fill: var(--paper2); stroke: var(--border); }
.mode-diagram-svg .team-node.wb { fill: #eef6ff; stroke: var(--C); }
.mode-diagram-svg .team-node.lb { fill: #fff4ee; stroke: #e08020; }
.mode-diagram-svg .t-label { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; font-size: 9px !important; fill: var(--ink2); font-weight: 500; }
.mode-diagram-svg .t-label-sm { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; font-size: 8px !important; fill: var(--ink3); }
.mode-diagram-svg .round-label { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; font-size: 8px !important; fill: var(--ink3); letter-spacing: 0.05em; text-transform: uppercase; }
.mode-diagram-svg .arrow { stroke: var(--ink3); stroke-width: 1.2; fill: none; marker-end: url(#arr); }
.mode-diagram-svg .arrow-win { stroke: var(--L); stroke-width: 1.5; fill: none; marker-end: url(#arr-win); }
.mode-diagram-svg .arrow-lose { stroke: var(--K); stroke-width: 1.5; fill: none; stroke-dasharray: 4 2; marker-end: url(#arr-lose); }
.mode-diagram-svg .connector { stroke: var(--border); stroke-width: 1.2; fill: none; }
.mode-diagram-svg .bracket-line { stroke: var(--ink2); stroke-width: 1.5; fill: none; }
.mode-diagram-svg .phase-box { fill: none; stroke: var(--border); stroke-width: 1; stroke-dasharray: 3 2; rx: 3; }
.mode-diagram-svg .phase-label { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; font-size: 9px !important; fill: var(--ink3); font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; }
.mode-diagram-svg .mode-diagram-canvas { width: 100%; height: 100%; display: block; overflow: visible; }
`;

const DEFAULT_DEFS = `<defs>
  <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="var(--ink3)"/></marker>
  <marker id="arr-win" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="var(--L)"/></marker>
  <marker id="arr-lose" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="var(--K)"/></marker>
</defs>`;

function ensureDefs(svg: string): string {
  if (svg.includes('<defs>')) return svg;
  const index = svg.indexOf('>');
  if (index < 0) return svg;
  return `${svg.slice(0, index + 1)}${DEFAULT_DEFS}${svg.slice(index + 1)}`;
}

function extractSvgMap(): Partial<Record<TournamentModeVariant, string>> {
  const map: Partial<Record<TournamentModeVariant, string>> = {};
  const regex =
    /<span class="card-id id-[LKC]">(L[1-4]|K[1-6]|C[1-5])<\/span>[\s\S]*?<div class="diagram"[^>]*>\s*(<svg[\s\S]*?<\/svg>)/g;
  let match = regex.exec(referenceHtml);
  while (match) {
    const variant = match[1] as TournamentModeVariant;
    map[variant] = ensureDefs(match[2]).replace('<svg ', '<svg preserveAspectRatio="xMidYMid meet" ');
    match = regex.exec(referenceHtml);
  }
  return map;
}

function normalizeSvgForVariant(variant: TournamentModeVariant, rawSvg: string): string {
  let svg = rawSvg;

  if (variant === 'K3') {
    svg = svg
      .replace('A-Sieger → GF', 'A -> GF')
      .replace('B-Sieger → GF', 'B -> GF')
      .replace('C-Sieger → GF', 'C -> GF');
  }

  if (variant === 'K4') {
    svg = svg.replace('Vl(S1) vs Si(S2)', 'V(S1) vs S(S2)');
  }

  if (variant === 'C3') {
    svg = svg.replace('Vl(S1) vs Si(S2)', 'V(S1) vs S(S2)');
  }

  if (variant === 'C4') {
    svg = svg
      .replace('>Double Elimination<', '>Double Elim.<')
      .replace('>+ WB-Verlierer<', '>+ WB-Verl.<')
      .replace('x="50" y="4"', 'x="50" y="8"')
      .replace('x="202" y="4"', 'x="202" y="8"');
  }

  svg = svg.replace(
    /<svg([^>]*)>/,
    (_m, attrs: string) => {
      const withoutSize = attrs
        .replace(/\swidth="[^"]*"/, '')
        .replace(/\sheight="[^"]*"/, '')
        .replace(/\spreserveAspectRatio="[^"]*"/, '')
        .replace(/\sclass="[^"]*"/, '');
      return `<svg class="mode-diagram-canvas"${withoutSize} preserveAspectRatio="xMidYMid meet">`;
    }
  );

  return svg;
}

const SVG_MAP = extractSvgMap();
const FALLBACK = `<svg width="300" height="150" viewBox="0 0 300 150"><rect x="10" y="10" width="280" height="130" rx="6" class="team-node tbd"/><text x="150" y="78" text-anchor="middle" class="t-label">Diagramm nicht verfuegbar</text></svg>`;

function renderL1Fixed() {
  return (
    <svg className="mode-diagram-canvas" viewBox="0 0 300 150" preserveAspectRatio="xMidYMid meet">
      <line x1="150" y1="19" x2="255" y2="71" stroke="var(--L)" strokeWidth="1.2" opacity="0.55" />
      <line x1="150" y1="19" x2="150" y2="123" stroke="var(--L)" strokeWidth="1.2" opacity="0.55" />
      <line x1="150" y1="19" x2="45" y2="71" stroke="var(--L)" strokeWidth="1.2" opacity="0.55" />
      <line x1="255" y1="71" x2="150" y2="123" stroke="var(--L)" strokeWidth="1.2" opacity="0.55" />
      <line x1="255" y1="71" x2="45" y2="71" stroke="var(--L)" strokeWidth="1.2" opacity="0.55" />
      <line x1="150" y1="123" x2="45" y2="71" stroke="var(--L)" strokeWidth="1.2" opacity="0.55" />

      <rect x="115" y="8" width="70" height="22" rx="3" className="team-node winner" />
      <text x="150" y="23" textAnchor="middle" className="t-label">Team A</text>
      <rect x="220" y="60" width="70" height="22" rx="3" className="team-node" />
      <text x="255" y="75" textAnchor="middle" className="t-label">Team B</text>
      <rect x="115" y="112" width="70" height="22" rx="3" className="team-node" />
      <text x="150" y="127" textAnchor="middle" className="t-label">Team C</text>
      <rect x="10" y="60" width="70" height="22" rx="3" className="team-node" />
      <text x="45" y="75" textAnchor="middle" className="t-label">Team D</text>

      <rect x="195" y="110" width="98" height="36" rx="2" fill="var(--paper)" stroke="var(--border)" strokeWidth="1" />
      <text x="244" y="122" textAnchor="middle" className="t-label-sm" style={{ fill: 'var(--ink3)' }}>ABSCHLUSS</text>
      <text x="244" y="133" textAnchor="middle" className="t-label" style={{ fill: 'var(--L)' }}>Tabelle</text>
      <text x="244" y="143" textAnchor="middle" className="t-label-sm">nach Punkten</text>
    </svg>
  );
}

function renderC5Clear() {
  return (
    <svg className="mode-diagram-canvas" viewBox="0 0 360 180" preserveAspectRatio="xMidYMid meet">
      <defs>
        <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="var(--ink3)" />
        </marker>
      </defs>

      <rect x="8" y="22" width="108" height="136" rx="6" fill="var(--L-bg)" stroke="var(--L-mid)" strokeWidth="1.5" />
      <text x="62" y="16" textAnchor="middle" className="phase-label" style={{ fill: 'var(--L)' }}>
        STUFE 1 - QUALI
      </text>
      <rect x="16" y="38" width="92" height="52" rx="4" className="team-node winner" />
      <text x="62" y="58" textAnchor="middle" className="t-label">
        Swiss / Qualifikation
      </text>
      <text x="62" y="74" textAnchor="middle" className="t-label-sm">
        Beispiel: 32 Teams
      </text>
      <rect x="16" y="100" width="92" height="46" rx="4" className="team-node" />
      <text x="62" y="120" textAnchor="middle" className="t-label">
        Top 16 qualifizieren
      </text>
      <text x="62" y="135" textAnchor="middle" className="t-label-sm">
        zur Hauptrunde
      </text>

      <path d="M116,90 L128,90" className="arrow" />

      <rect x="132" y="22" width="108" height="136" rx="6" fill="var(--C-bg)" stroke="var(--C-mid)" strokeWidth="1.5" />
      <text x="186" y="16" textAnchor="middle" className="phase-label" style={{ fill: 'var(--C)' }}>
        STUFE 2 - HAUPTRUNDE
      </text>
      <rect x="140" y="38" width="92" height="52" rx="4" className="team-node wb" />
      <text x="186" y="58" textAnchor="middle" className="t-label">
        Gruppenphase
      </text>
      <text x="186" y="74" textAnchor="middle" className="t-label-sm">
        4 Gruppen à 4 Teams
      </text>
      <rect x="140" y="100" width="92" height="46" rx="4" className="team-node" />
      <text x="186" y="120" textAnchor="middle" className="t-label">
        Top 2 je Gruppe
      </text>
      <text x="186" y="135" textAnchor="middle" className="t-label-sm">
        8 Teams für Finalphase
      </text>

      <path d="M240,90 L252,90" className="arrow" />

      <rect x="256" y="22" width="96" height="136" rx="6" fill="var(--K-bg)" stroke="var(--K-mid)" strokeWidth="1.5" />
      <text x="304" y="16" textAnchor="middle" className="phase-label" style={{ fill: 'var(--K)' }}>
        STUFE 3 - FINALPHASE
      </text>
      <rect x="262" y="38" width="84" height="44" rx="4" className="team-node wb" />
      <text x="304" y="58" textAnchor="middle" className="t-label">
        KO / Double Elim
      </text>
      <text x="304" y="73" textAnchor="middle" className="t-label-sm">
        je nach Turnier-Setup
      </text>
      <rect x="262" y="92" width="84" height="54" rx="4" fill="#fffbea" stroke="#c0a000" strokeWidth="1.5" />
      <text x="304" y="116" textAnchor="middle" className="t-label" style={{ fill: '#8a6000' }}>
        Grand Final
      </text>
      <text x="304" y="134" textAnchor="middle" className="t-label-sm" style={{ fill: '#8a6000' }}>
        Sieger
      </text>
    </svg>
  );
}

export default function TournamentModeDiagram({ variant, size = 'sm' }: TournamentModeDiagramProps) {
  const svg = normalizeSvgForVariant(variant, SVG_MAP[variant] ?? FALLBACK);

  return (
    <div
      className={cn(
        'mode-diagram-svg rounded-md border border-border bg-muted/30 p-2',
        size === 'lg' ? 'h-[240px]' : 'h-[180px]'
      )}
    >
      <style>{SVG_STYLE}</style>
      {variant === 'L1' ? renderL1Fixed() : variant === 'C5' ? renderC5Clear() : <div dangerouslySetInnerHTML={{ __html: svg }} />}
    </div>
  );
}
