import { format, parseISO } from 'date-fns';

// Tolerant date formatting — if a value somehow isn't a valid ISO string we show
// it verbatim rather than throwing inside a render.
export function formatDate(iso, pattern = 'd MMM yyyy') {
  if (!iso) return '—';
  try {
    return format(parseISO(iso), pattern);
  } catch {
    return iso;
  }
}

export function formatMonth(iso) {
  return formatDate(iso, 'MMM yy');
}
