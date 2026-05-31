import { CalendarDays } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/lib/format';
import { MetricTile } from './metric-tile';

// Headline card: the most recent report's metrics, each compared against the
// previous report so the patient sees movement at a glance.
export function LatestReportCard({ report, previous }) {
  const previousByCode = new Map((previous?.metrics ?? []).map((m) => [m.code, m.value]));

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Latest report</CardTitle>
        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          <CalendarDays className="h-4 w-4" aria-hidden="true" />
          {formatDate(report.reportDate)} · {report.source}
        </span>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {report.metrics.map((metric) => {
            const prev = previousByCode.get(metric.code);
            const delta = prev == null || metric.value == null ? null : metric.value - prev;
            return <MetricTile key={metric.code} metric={metric} delta={delta} />;
          })}
        </div>
        {report.summary ? (
          <p className="mt-4 rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Clinician note: </span>
            {report.summary}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
