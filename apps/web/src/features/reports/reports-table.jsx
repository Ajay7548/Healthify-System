import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

// Out-of-range values are tinted so a scan down a column surfaces problems
// without needing a badge in every cell.
const flagColor = {
  HIGH: 'text-red-600 font-semibold',
  LOW: 'text-amber-600 font-semibold',
  NORMAL: 'text-foreground',
};

export function ReportsTable({ reports }) {
  const columns = reports[0]?.metrics ?? [];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2 font-medium">Date</th>
            <th className="px-3 py-2 font-medium">Source</th>
            {columns.map((column) => (
              <th key={column.code} className="px-3 py-2 text-right font-medium">
                {column.label}
                {column.unit ? (
                  <span className="ml-1 font-normal normal-case">({column.unit})</span>
                ) : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {reports.map((report) => (
            <tr
              key={report.id}
              className="border-b border-border/60 last:border-0 hover:bg-muted/40"
            >
              <td className="whitespace-nowrap px-3 py-2.5 font-medium">
                {formatDate(report.reportDate)}
              </td>
              <td className="px-3 py-2.5 text-muted-foreground">{report.source}</td>
              {report.metrics.map((metric) => (
                <td
                  key={metric.code}
                  className={cn('px-3 py-2.5 text-right tabular-nums', flagColor[metric.flag])}
                >
                  {metric.kind === 'CATEGORICAL' ? metric.valueText : metric.value}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
