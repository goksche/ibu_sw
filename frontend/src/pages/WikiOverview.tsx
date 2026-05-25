import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui';
import { Info, ArrowRight } from 'phosphor-react';

export default function WikiOverview() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto w-full max-w-[1100px] p-6">
      <div className="mb-6 border-b-2 border-foreground/80 pb-4">
        <h1 className="m-0 text-3xl font-extrabold tracking-tight text-foreground">Wiki</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Zentrale Uebersicht fuer Erklaerungen, Visualisierungen und Regeln. Weitere Wiki-Bereiche koennen hier laufend ergaenzt werden.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border border-border bg-card p-5">
          <div className="mb-3 inline-flex items-center gap-2 rounded border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-xs text-blue-700 dark:text-blue-300">
            <Info size={14} weight="bold" />
            Wiki-Eintrag
          </div>
          <h2 className="m-0 text-lg font-semibold text-foreground">Turniermodi</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Visualisierungen und erklaerende Inhalte zu allen Modusvarianten (L, K, C).
          </p>
          <button
            type="button"
            onClick={() => navigate('/wiki/modes')}
            className="mt-4 inline-flex items-center gap-2 rounded border border-border bg-background px-3 py-2 text-xs text-foreground hover:bg-muted"
          >
            Oeffnen
            <ArrowRight size={14} weight="bold" />
          </button>
        </Card>
      </div>
    </div>
  );
}
