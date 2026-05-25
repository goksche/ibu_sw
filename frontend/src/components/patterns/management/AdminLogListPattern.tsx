import { Badge, Card, CardContent } from '@/components/ui';

export interface AdminLogEntry {
  id: string | number;
  timestamp: string;
  actor: string;
  action: string;
  scope?: string;
  severity?: 'info' | 'warning' | 'error' | 'success' | 'default';
}

interface AdminLogListPatternProps {
  title?: string;
  entries: AdminLogEntry[];
  dense?: boolean;
}

export default function AdminLogListPattern({
  title = 'Admin Logs',
  entries,
  dense = true,
}: AdminLogListPatternProps) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="border-b border-border px-4 py-3">
          <h3 className="m-0 text-sm font-semibold text-foreground">{title}</h3>
        </div>
        <ul className="m-0 list-none p-0 divide-y divide-border">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className={dense ? 'px-4 py-2 text-xs text-foreground' : 'px-4 py-3 text-sm text-foreground'}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{entry.timestamp}</span>
                <Badge variant={entry.severity || 'default'}>{entry.action}</Badge>
                {entry.scope && <span className="text-muted-foreground">{entry.scope}</span>}
              </div>
              <div className="mt-1 text-muted-foreground">{entry.actor}</div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
