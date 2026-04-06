import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui';

interface SettingsSectionPatternProps {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export default function SettingsSectionPattern({
  title,
  description,
  children,
  footer,
}: SettingsSectionPatternProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-4">
          <h3 className="m-0 text-base font-semibold text-foreground">{title}</h3>
          {description && <p className="mt-1 mb-0 text-sm text-muted-foreground">{description}</p>}
        </div>
        <div className="space-y-4">{children}</div>
        {footer && <div className="mt-6 border-t border-border pt-4">{footer}</div>}
      </CardContent>
    </Card>
  );
}
