import { ArrowDown, ArrowUp } from 'lucide-react';
import { Badge, flagTone } from '@/components/ui/badge';

function referenceLabel(metric) {
  const { refLow, refHigh, unit } = metric;
  if (refLow != null && refHigh != null) return `Ref ${refLow}–${refHigh} ${unit}`;
  if (refHigh != null) return `Ref < ${refHigh} ${unit}`;
  if (refLow != null) return `Ref > ${refLow} ${unit}`;
  return unit;
}

// Delta is shown without good/bad colour: a rise in heart rate or glucose isn't
// universally "bad", so we report the direction factually and leave clinical
// judgement to the reference range + flag.
function Delta({ delta }) {
  if (delta == null || delta === 0) return null;
  const Icon = delta > 0 ? ArrowUp : ArrowDown;
  return (
    <span className="inline-flex items-center gap-0.5 text-muted-foreground">
      <Icon className="h-3 w-3" aria-hidden="true" />
      {Math.abs(delta)} vs last
    </span>
  );
}

export function MetricTile({ metric, delta }) {
  const categorical = metric.kind === 'CATEGORICAL';
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-muted-foreground">{metric.label}</p>
        <Badge tone={flagTone(metric.flag)}>{metric.flag.toLowerCase()}</Badge>
      </div>
      {categorical ? (
        // No value/unit or numeric reference range for a qualitative result.
        <div className="mt-2 flex items-baseline">
          <span className="text-2xl font-semibold">{metric.valueText ?? '—'}</span>
        </div>
      ) : (
        <>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-semibold tabular-nums">{metric.value}</span>
            <span className="text-sm text-muted-foreground">{metric.unit}</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>{referenceLabel(metric)}</span>
            <Delta delta={delta} />
          </div>
        </>
      )}
    </div>
  );
}
