import multer from 'multer';
import { BadRequestError } from '../common/errors.js';

// Memory storage: a CSV under the size cap is small enough to hold in memory,
// and it avoids writing temp files to a read-only/ephemeral container disk.
const single = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const looksLikeCsv =
      file.mimetype === 'text/csv' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      file.originalname.toLowerCase().endsWith('.csv');
    cb(looksLikeCsv ? null : new BadRequestError('Only .csv files are accepted'), looksLikeCsv);
  },
}).single('file');

// Wrap multer so its errors (e.g. file too large) become our standard 400s
// instead of bubbling up as an unhandled 500.
export function uploadCsv(req, res, next) {
  single(req, res, (error) => {
    if (!error) {
      next();
      return;
    }
    if (error instanceof multer.MulterError) {
      const message =
        error.code === 'LIMIT_FILE_SIZE'
          ? 'File exceeds the 5 MB limit'
          : `Upload error: ${error.message}`;
      next(new BadRequestError(message));
      return;
    }
    next(error); // BadRequestError from fileFilter, or anything unexpected
  });
}
