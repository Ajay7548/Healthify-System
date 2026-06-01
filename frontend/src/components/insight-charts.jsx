import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// A shared categorical palette (teal-led to match the app's primary).
const PALETTE = [
  '#0d9488',
  '#0ea5e9',
  '#6366f1',
  '#f59e0b',
  '#ec4899',
  '#10b981',
  '#8b5cf6',
  '#ef4444',
  '#14b8a6',
  '#f97316',
  '#64748b',
];
const AXIS_TICK = { fontSize: 12, fill: '#64748b' };
const TOOLTIP_STYLE = { borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 };
const GRID = '#e2e8f0';

export function StatCard({ label, value, hint }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-3xl font-semibold tabular-nums">{value}</p>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

function ChartCard({ title, description, height = 280, children }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          {children}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// Counts by category. `horizontal` draws bars left-to-right (better for long
// labels like conditions/states); otherwise vertical bars over a category axis.
export function CategoryBars({ title, description, data, color = PALETTE[0], horizontal = false }) {
  if (horizontal) {
    return (
      <ChartCard title={title} description={description} height={Math.max(220, data.length * 34)}>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
          <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke={GRID} />
          <XAxis type="number" tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="key"
            width={140}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: '#f1f5f9' }} />
          <Bar dataKey="count" fill={color} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ChartCard>
    );
  }
  return (
    <ChartCard title={title} description={description}>
      <BarChart data={data} margin={{ left: -8, right: 8, top: 4, bottom: 4 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={GRID} />
        <XAxis dataKey="key" tick={AXIS_TICK} tickLine={false} axisLine={false} />
        <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={40} allowDecimals={false} />
        <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: '#f1f5f9' }} />
        <Bar dataKey="count" fill={color} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartCard>
  );
}

export function GenderDonut({ data }) {
  return (
    <ChartCard title="Gender split">
      <PieChart>
        <Pie data={data} dataKey="count" nameKey="key" innerRadius={60} outerRadius={100} paddingAngle={2}>
          {data.map((entry, index) => (
            <Cell key={entry.key} fill={PALETTE[index % PALETTE.length]} />
          ))}
        </Pie>
        <Legend />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
      </PieChart>
    </ChartCard>
  );
}

export function AbnormalByMetric({ data }) {
  const rows = data.map((m) => ({
    key: m.label,
    pct: Math.round(m.rate * 100),
    abnormal: m.abnormal,
    total: m.total,
  }));
  return (
    <ChartCard
      title="Out-of-range rate by metric"
      description="Share of clients flagged LOW or HIGH on their most recent report."
    >
      <BarChart data={rows} margin={{ left: -8, right: 8, top: 4, bottom: 24 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={GRID} />
        <XAxis
          dataKey="key"
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          interval={0}
          angle={-15}
          textAnchor="end"
          height={50}
        />
        <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={44} unit="%" domain={[0, 100]} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          cursor={{ fill: '#f1f5f9' }}
          formatter={(value, _name, item) => [
            `${value}% (${item.payload.abnormal}/${item.payload.total})`,
            'Out of range',
          ]}
        />
        <Bar dataKey="pct" fill="#ef4444" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartCard>
  );
}

export function ReportsTrend({ data }) {
  return (
    <ChartCard title="Reports over time" description="Monthly report volume.">
      <AreaChart data={data} margin={{ left: -8, right: 8, top: 4, bottom: 4 }}>
        <defs>
          <linearGradient id="reportsGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0d9488" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#0d9488" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={GRID} />
        <XAxis dataKey="month" tick={AXIS_TICK} tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={40} allowDecimals={false} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Area type="monotone" dataKey="count" stroke="#0d9488" strokeWidth={2} fill="url(#reportsGradient)" />
      </AreaChart>
    </ChartCard>
  );
}
