import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface TournamentSectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export default function TournamentSectionHeader({
  title,
  subtitle,
  icon,
  actions,
  className,
}: TournamentSectionHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-3', className)}>
      <div>
        <div className="flex items-center gap-2">
          {icon && <span className="text-primary">{icon}</span>}
          <h2 className="m-0 text-xl font-semibold text-foreground">{title}</h2>
        </div>
        {subtitle && <p className="mt-1 mb-0 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
