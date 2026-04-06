import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui';

interface DataTablePatternProps {
  title?: string;
  filters?: ReactNode;
  loading?: boolean;
  isEmpty?: boolean;
  emptyText?: string;
  pagination?: ReactNode;
  children: ReactNode;
}

export default function DataTablePattern({
  title,
  filters,
  loading,
  isEmpty,
  emptyText,
  pagination,
  children,
}: DataTablePatternProps) {
  return (
    <Card>
      <CardContent className="p-0">
        {(title || filters) && (
          <div className="border-b border-border p-4">
            {title && <h3 className="m-0 text-base font-semibold text-foreground">{title}</h3>}
            {filters && <div className="mt-3">{filters}</div>}
          </div>
        )}

        {loading ? (
          <div className="p-6 text-sm text-muted-foreground">Lade Daten...</div>
        ) : isEmpty ? (
          <div className="p-6 text-sm text-muted-foreground">{emptyText || 'Keine Daten vorhanden.'}</div>
        ) : (
          <div className="overflow-x-auto">{children}</div>
        )}

        {pagination && <div className="border-t border-border p-4">{pagination}</div>}
      </CardContent>
    </Card>
  );
}
