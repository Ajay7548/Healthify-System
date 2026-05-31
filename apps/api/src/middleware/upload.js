import multer from 'multer';
import { BadRequestError } from '../common/errors.js';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

// Memory storage: a dataset under the size cap is small enough to hold in memory
// (the company's ~25k-row xlsx is ~2 MB zipped), and it avoids writing temp files
// to a read-only/ephemeral container disk.
const single = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    const name = file.originalname.toLowerCase();
    const accepted =
      name.endsWith('.csv') ||
      name.endsWith('.xlsx') ||
      file.mimetype === 'text/csv' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      file.mimetype === XLSX_MIME;
    cb(accepted ? null : new BadRequestError('Only .csv or .xlsx files are accepted'), accepted);
  },
}).single('file');

// Wrap multer so its errors (e.g. file too large) become our standard 400s
// instead of bubbling up as an unhandled 500.
export function uploadDataset(req, res, next) {
  single(req, res, (error) => {
    if (!error) {
      next();
      return;
    }
    if (error instanceof multer.MulterError) {
      const message =
        error.code === 'LIMIT_FILE_SIZE'
          ? 'File exceeds the 10 MB limit'
          : `Upload error: ${error.message}`;
      next(new BadRequestError(message));
      return;
    }
    next(error); // BadRequestError from fileFilter, or anything unexpected
  });
}
