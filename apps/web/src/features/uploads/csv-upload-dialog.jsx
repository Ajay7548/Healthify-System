import { useState } from 'react';
import { Upload } from 'lucide-react';
import { CSV_REQUIRED_HEADERS } from '@hc/shared';
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
import { useUploadCsv } from './use-uploads';
import { UploadSummary } from './upload-summary';

const MAX_BYTES = 5 * 1024 * 1024;

// Naive split for the preview only — the server does the real, quote-aware parse.
function parsePreview(text) {
  const lines = text
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .slice(0, 4);
  if (lines.length === 0) return null;
  const rows = lines.map((line) => line.split(','));
  return { headers: rows[0], body: rows.slice(1) };
}

export function CsvUploadDialog() {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [clientError, setClientError] = useState(null);
  const mutation = useUploadCsv();

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
    if (!selected.name.toLowerCase().endsWith('.csv')) {
      setClientError('Please choose a .csv file.');
      setFile(null);
      return;
    }
    if (selected.size > MAX_BYTES) {
      setClientError('That file is larger than the 5 MB limit.');
      setFile(null);
      return;
    }
    setFile(selected);
    selected
      .text()
      .then((text) => setPreview(parsePreview(text)))
      .catch(() => setPreview(null));
  }

  const result = mutation.data;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Upload className="h-4 w-4" aria-hidden="true" />
          Upload CSV
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload health reports</DialogTitle>
          <DialogDescription>
            A CSV with columns: {CSV_REQUIRED_HEADERS.join(', ')}.
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
              accept=".csv,text/csv"
              onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
              className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary-hover"
            />

            {clientError ? <p className="text-sm text-danger">{clientError}</p> : null}

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
                <p className="px-2 py-1.5 text-xs text-muted-foreground">
                  Preview of the first rows.
                </p>
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
