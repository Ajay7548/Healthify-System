import { useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatMonth } from '@/lib/format';

// Plots one metric's history with its reference range drawn in. `reports` is in
// chronological (oldest-first) order so the line reads left-to-right.
export function HealthTrendChart({ reports }) {
  // Only numeric metrics can be plotted on a value axis; categorical results
  // (e.g. urine protein) are shown in the tiles and history table instead.
  const available = (reports.at(-1)?.metrics ?? []).filter((m) => m.kind !== 'CATEGORICAL');
  const [selectedCode, setSelectedCode] = useState(available[0]?.code);

  const selected = available.find((m) => m.code === selectedCode) ?? available[0];
  if (!selected) return null;

  const data = reports.map((report) => {
    const metric = report.metrics.find((m) => m.code === selected.code);
    return { date: formatMonth(report.reportDate), value: metric?.value ?? null };
  });

  return (
    <Card>
      <CardHeader className="gap-3">
        <CardTitle>Trends</CardTitle>
        <div className="flex flex-wrap gap-2">
          {available.map((metric) => (
            <button
              key={metric.code}
              type="button"
              onClick={() => setSelectedCode(metric.code)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                metric.code === selected.code
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-border',
              )}
            >
              {metric.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} />
            <YAxis
              domain={['auto', 'auto']}
              tick={{ fontSize: 12, fill: '#64748b' }}
              tickLine={false}
              axisLine={false}
              width={40}
            />
            <Tooltip
              formatter={(value) => [`${value} ${selected.unit}`, selected.label]}
              contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
            />
            {selected.refLow != null ? (
              <ReferenceLine y={selected.refLow} stroke="#f59e0b" strokeDasharray="4 4" />
            ) : null}
            {selected.refHigh != null ? (
              <ReferenceLine y={selected.refHigh} stroke="#f59e0b" strokeDasharray="4 4" />
            ) : null}
            <Line
              type="monotone"
              dataKey="value"
              stroke="#0d9488"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
        <p className="mt-2 text-xs text-muted-foreground">
          Dashed lines show the reference range for {selected.label.toLowerCase()}.
        </p>
      </CardContent>
    </Card>
  );
}
