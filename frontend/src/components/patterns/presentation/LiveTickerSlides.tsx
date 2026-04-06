import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui';
import LiveTickerSlideShell from './LiveTickerSlideShell';
import KOBracketPattern from '@/components/domain/tournament/KOBracketPattern';
import { KnockoutMatch } from '@/services/matchService';
import { Participant } from '@/types';

export function LiveTickerSlideTitle({
  tournamentName,
  subtitle,
  refreshHint,
}: {
  tournamentName: string;
  subtitle: string;
  refreshHint: string;
}) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
      <h1 className="m-0 text-5xl font-bold text-foreground">{tournamentName}</h1>
      <p className="mt-4 mb-0 text-2xl text-muted-foreground">{subtitle}</p>
      <p className="mt-6 mb-0 text-lg text-muted-foreground">{refreshHint}</p>
    </div>
  );
}

export function LiveTickerSlideGroups({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <LiveTickerSlideShell title={title} subtitle={subtitle}>
      {children}
    </LiveTickerSlideShell>
  );
}

export function LiveTickerSlideQualification({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <LiveTickerSlideShell title={title} subtitle={subtitle}>
      <Card>
        <CardContent className="p-6">{children}</CardContent>
      </Card>
    </LiveTickerSlideShell>
  );
}

export function LiveTickerSlideKO({
  title,
  subtitle,
  matches,
  participants,
  tournamentId,
  drawMode,
  koDistribution,
}: {
  title: string;
  subtitle?: string;
  matches: KnockoutMatch[];
  participants: Participant[];
  tournamentId: number;
  drawMode?: string | null;
  koDistribution?: string | null;
}) {
  return (
    <LiveTickerSlideShell title={title} subtitle={subtitle}>
      <KOBracketPattern
        matches={matches}
        participants={participants}
        tournamentId={tournamentId}
        drawMode={drawMode}
        koDistribution={koDistribution}
        mode="presentation"
      />
    </LiveTickerSlideShell>
  );
}
