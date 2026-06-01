import { useState } from 'react';
import { Upload } from 'lucide-react';
import { HEALTH_REPORT_HEADERS } from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useUploadDataset } from '@/hooks/use-uploads';
import { UploadSummary } from './upload-summary';

const MAX_BYTES = 10 * 1024 * 1024;

// Naive split for the CSV preview only — the server does the real, quote-aware
// parse. An .xlsx is binary, so it's previewed as a note rather than a table.
function parsePreview(text) {
  const lines = text
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .slice(0, 4);
  if (lines.length === 0) return null;
  const rows = lines.map((line) => line.split(','));
  return { headers: rows[0], body: rows.slice(1) };
}

export function UploadDialog() {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [clientError, setClientError] = useState(null);
  const mutation = useUploadDataset();

  function reset() {
    setFile(null);
    setPreview(null);
    setClientError(null);
    mutation.reset();
  }

  function onOpenChange(next) {
    setOpen(next);
    if (!next) reset();
  }

  function chooseFile(selected) {
    setClientError(null);
    setPreview(null);
    mutation.reset();
    if (!selected) {
      setFile(null);
      return;
    }
    const name = selected.name.toLowerCase();
    if (!name.endsWith('.csv') && !name.endsWith('.xlsx')) {
      setClientError('Please choose a .csv or .xlsx file.');
      setFile(null);
      return;
    }
    if (selected.size > MAX_BYTES) {
      setClientError('That file is larger than the 10 MB limit.');
      setFile(null);
      return;
    }
    setFile(selected);
    // Only CSV can be previewed in the browser; .xlsx is parsed server-side.
    if (name.endsWith('.csv')) {
      selected
        .text()
        .then((text) => setPreview(parsePreview(text)))
        .catch(() => setPreview(null));
    }
  }

  const result = mutation.data;
  const isXlsx = file?.name.toLowerCase().endsWith('.xlsx');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Upload className="h-4 w-4" aria-hidden="true" />
          Upload data
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload health reports</DialogTitle>
          <DialogDescription>
            An Excel workbook with <code>clients</code> and <code>health_reports</code> sheets, or a
            health-report CSV ({HEALTH_REPORT_HEADERS.join(', ')}). Reports link to a client by{' '}
            <code>client_id</code>.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4">
            <UploadSummary batch={result} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={reset}>
                Upload another
              </Button>
              <DialogClose asChild>
                <Button>Done</Button>
              </DialogClose>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <input
              type="file"
              accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
              className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary-hover"
            />

            {clientError ? <p className="text-sm text-danger">{clientError}</p> : null}

            {isXlsx ? (
              <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                Excel workbook selected — the server will import the <code>clients</code> and{' '}
                <code>health_reports</code> sheets.
              </p>
            ) : null}

            {preview ? (
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/50 text-left text-muted-foreground">
                      {preview.headers.map((header) => (
                        <th key={header} className="px-2 py-1.5 font-medium">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.body.map((row, rowIndex) => (
                      <tr key={rowIndex} className="border-b border-border/60 last:border-0">
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex} className="whitespace-nowrap px-2 py-1.5">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="px-2 py-1.5 text-xs text-muted-foreground">Preview of the first rows.</p>
              </div>
            ) : null}

            {mutation.isError ? (
              <p className="text-sm text-danger">
                {mutation.error?.message ?? 'Upload failed. Please try again.'}
              </p>
            ) : null}

            <div className="flex justify-end gap-2">
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button
                onClick={() => file && mutation.mutate(file)}
                disabled={!file || mutation.isPending}
              >
                {mutation.isPending ? (
                  <>
                    <Spinner className="h-4 w-4" /> Uploading…
                  </>
                ) : (
                  'Upload'
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
