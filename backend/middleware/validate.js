import { ZodError } from 'zod';
import { ValidationError } from '../utils/errors.js';

// Validate (and coerce) the request against the given Zod schemas before the
// controller runs, so a handler only ever sees well-formed input. The parsed
// values are stashed on res.locals — Express 5 makes req.query read-only, so we
// don't mutate it — and read back in the controller via validated(res).
export function validate(schemas) {
  return (req, res, next) => {
    try {
      const parsed = {
        body: schemas.body ? schemas.body.parse(req.body) : undefined,
        query: schemas.query ? schemas.query.parse(req.query) : undefined,
        params: schemas.params ? schemas.params.parse(req.params) : undefined,
      };
      res.locals.validated = parsed;
      // req.body is writable; keep it in sync so generic code can read it too.
      if (schemas.body) req.body = parsed.body;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        }));
        next(new ValidationError(details));
        return;
      }
      next(error);
    }
  };
}

// Reads back whatever validate() stored for this request.
export function validated(res) {
  return res.locals.validated;
}
