import { ReactNode } from 'react';
import { Badge, Card, CardContent } from '@/components/ui';

export interface StandingColumn<T = Record<string, unknown>> {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  render: (row: T) => ReactNode;
}

interface StandingTablePatternProps<T = Record<string, unknown>> {
  title?: string;
  subtitle?: string;
  rows: T[];
  columns: StandingColumn<T>[];
  tieBreakNote?: string;
  emptyText?: string;
}

export default function StandingTablePattern<T>({
  title,
  subtitle,
  rows,
  columns,
  tieBreakNote,
  emptyText = 'Keine Daten verfügbar.',
}: StandingTablePatternProps<T>) {
  return (
    <Card>
      <CardContent className="p-0">
        {(title || subtitle) && (
          <div className="border-b border-border px-4 py-3">
            {title && <h3 className="m-0 text-base font-semibold text-foreground">{title}</h3>}
            {subtitle && <p className="mt-1 mb-0 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
        )}
        {rows.length === 0 ? (
          <div className="px-4 py-6 text-sm text-muted-foreground">{emptyText}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {columns.map((column) => (
                    <th
                      key={column.key}
                      className={`px-3 py-2 font-semibold text-foreground ${
                        column.align === 'right'
                          ? 'text-right'
                          : column.align === 'center'
                          ? 'text-center'
                          : 'text-left'
                      }`}
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={idx} className="border-b border-border/60 hover:bg-muted/30">
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={`px-3 py-2 ${
                          column.align === 'right'
                            ? 'text-right'
                            : column.align === 'center'
                            ? 'text-center'
                            : 'text-left'
                        }`}
                      >
                        {column.render(row)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {tieBreakNote && (
          <div className="border-t border-border px-4 py-3">
            <Badge variant="info">{tieBreakNote}</Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
