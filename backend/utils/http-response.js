// Thin helpers so every controller emits the exact same success envelope. The
// error envelope is produced centrally by the error handler.
//
// Success: { success: true, data, meta?: { pagination } }
// Error:   { success: false, error: { code, message, details? }, requestId }

export function sendSuccess(res, data, status = 200) {
  res.status(status).json({ success: true, data });
}

export function sendCreated(res, data) {
  sendSuccess(res, data, 201);
}

export function sendPaginated(res, data, pagination) {
  res.status(200).json({ success: true, data, meta: { pagination } });
}
