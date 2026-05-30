import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Merge conditional class names and resolve Tailwind conflicts (the last wins),
// so callers can layer overrides without fighting specificity.
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
