import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface LiveTickerSlideShellProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}

export default function LiveTickerSlideShell({
  title,
  subtitle,
  children,
  className,
}: LiveTickerSlideShellProps) {
  return (
    <section className={cn('space-y-6', className)}>
      {(title || subtitle) && (
        <header>
          {title && <h2 className="m-0 text-3xl font-bold text-foreground">{title}</h2>}
          {subtitle && <p className="mt-2 mb-0 text-lg text-muted-foreground">{subtitle}</p>}
        </header>
      )}
      <div>{children}</div>
    </section>
  );
}
