import { Fragment, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/format';

const statusTone = { COMPLETED: 'normal', PARTIAL: 'low', FAILED: 'high', PROCESSING: 'neutral' };

// Audit log of imports. Rows expand to reveal the per-row errors that were
// recorded at upload time (no extra request — the errors travel with the batch).
export function UploadsTable({ batches }) {
  const [expandedId, setExpandedId] = useState(null);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2 font-medium">File</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 text-right font-medium">Inserted</th>
            <th className="px-3 py-2 text-right font-medium">Skipped</th>
            <th className="px-3 py-2 text-right font-medium">Failed</th>
            <th className="px-3 py-2 font-medium">When</th>
          </tr>
        </thead>
        <tbody>
          {batches.map((batch) => {
            const isOpen = expandedId === batch.id;
            const Chevron = isOpen ? ChevronDown : ChevronRight;
            return (
              <Fragment key={batch.id}>
                <tr
                  onClick={() => setExpandedId(isOpen ? null : batch.id)}
                  className="cursor-pointer border-b border-border/60 hover:bg-muted/40"
                >
                  <td className="px-3 py-2.5">
                    <span className="inline-flex items-center gap-1.5 font-medium">
                      <Chevron className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      {batch.filename}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge tone={statusTone[batch.status]}>{batch.status.toLowerCase()}</Badge>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{batch.insertedRows}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{batch.skippedRows}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{batch.failedRows}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">
                    {formatDate(batch.createdAt, 'd MMM yyyy, HH:mm')}
                  </td>
                </tr>
                {isOpen ? (
                  <tr className="border-b border-border/60">
                    <td colSpan={6} className="bg-muted/30 px-4 py-3">
                      {batch.errors.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No row errors recorded.</p>
                      ) : (
                        <ul className="space-y-1 text-sm">
                          {batch.errors.map((error, index) => (
                            <li key={`${error.row}-${index}`}>
                              <span className="font-medium tabular-nums">Row {error.row}</span>
                              {error.column ? (
                                <span className="text-muted-foreground"> ({error.column})</span>
                              ) : null}
                              <span className="text-muted-foreground"> — {error.message}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
