import { Badge } from '@/components/ui/badge';

function Stat({ label, value, tone }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm">
      <span className="font-semibold tabular-nums">{value}</span>
      <span className="text-muted-foreground">{label}</span>
      {tone ? <span className={`h-2 w-2 rounded-full ${tone}`} /> : null}
    </div>
  );
}

const statusTone = {
  COMPLETED: 'normal',
  PARTIAL: 'low',
  FAILED: 'high',
  PROCESSING: 'neutral',
};

// The outcome of an import: headline counts, a status, and the per-row errors so
// a failed import tells you exactly which rows to fix.
export function UploadSummary({ batch }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={statusTone[batch.status]}>{batch.status.toLowerCase()}</Badge>
        {batch.clientsCreated > 0 || batch.clientsUpdated > 0 ? (
          <>
            <Stat label="clients added" value={batch.clientsCreated} tone="bg-teal-500" />
            <Stat label="clients updated" value={batch.clientsUpdated} tone="bg-sky-500" />
          </>
        ) : null}
        <Stat label="reports inserted" value={batch.insertedRows} tone="bg-emerald-500" />
        <Stat label="skipped" value={batch.skippedRows} tone="bg-slate-400" />
        <Stat label="failed" value={batch.failedRows} tone="bg-red-500" />
      </div>

      {batch.errors.length > 0 ? (
        <div className="overflow-hidden rounded-md border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 font-medium">Sheet</th>
                <th className="px-3 py-2 font-medium">Row</th>
                <th className="px-3 py-2 font-medium">Field</th>
                <th className="px-3 py-2 font-medium">Problem</th>
              </tr>
            </thead>
            <tbody>
              {batch.errors.map((error, index) => (
                <tr
                  key={`${error.row}-${index}`}
                  className="border-b border-border/60 last:border-0"
                >
                  <td className="px-3 py-2 text-muted-foreground">{error.sheet ?? '—'}</td>
                  <td className="px-3 py-2 tabular-nums">{error.row}</td>
                  <td className="px-3 py-2 text-muted-foreground">{error.column ?? '—'}</td>
                  <td className="px-3 py-2">{error.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
