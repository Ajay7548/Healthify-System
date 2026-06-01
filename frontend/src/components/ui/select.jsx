import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

// A lightly-styled native select — accessible by default and plenty for the
// admin filters, without pulling in a custom listbox.
export const Select = forwardRef(function Select({ className, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn(
        'h-10 rounded-md border border-border bg-surface px-3 text-sm',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
});
