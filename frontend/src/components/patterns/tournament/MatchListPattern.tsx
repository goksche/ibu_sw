import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui';
import TournamentSectionHeader from './TournamentSectionHeader';

interface MatchListPatternProps {
  title: string;
  subtitle?: string;
  toolbar?: ReactNode;
  children: ReactNode;
}

export default function MatchListPattern({
  title,
  subtitle,
  toolbar,
  children,
}: MatchListPatternProps) {
  return (
    <section className="space-y-3">
      <TournamentSectionHeader title={title} subtitle={subtitle} actions={toolbar} />
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">{children}</div>
        </CardContent>
      </Card>
    </section>
  );
}
