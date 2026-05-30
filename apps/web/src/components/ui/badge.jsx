import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
  {
    variants: {
      tone: {
        neutral: 'bg-muted text-muted-foreground',
        normal: 'bg-emerald-100 text-emerald-700',
        low: 'bg-amber-100 text-amber-700',
        high: 'bg-red-100 text-red-700',
        accent: 'bg-teal-100 text-teal-700',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

export function Badge({ className, tone, ...props }) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

// Map a metric flag (LOW | NORMAL | HIGH) to a badge tone.
export function flagTone(flag) {
  if (flag === 'HIGH') return 'high';
  if (flag === 'LOW') return 'low';
  return 'normal';
}
