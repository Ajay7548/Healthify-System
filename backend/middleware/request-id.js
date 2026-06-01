import { randomUUID } from 'node:crypto';

// Attach a stable id to every request and echo it back in a header. It ends up
// in the logs and in every error response, so a user can quote one string that
// pins down exactly which request to look at.
export function requestId(req, res, next) {
  const incoming = req.header('x-request-id');
  req.id = incoming && incoming.length <= 100 ? incoming : randomUUID();
  res.setHeader('x-request-id', req.id);
  next();
}
