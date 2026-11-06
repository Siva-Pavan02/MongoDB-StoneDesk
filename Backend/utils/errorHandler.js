// Error messages, stacks and database metadata may contain credentials or user data.
// Emit only a fixed event and a bounded, recognized code; never serialize the error.
const KNOWN_NAMES = new Set(['ValidationError', 'CastError', 'PrismaClientValidationError', 'MongoNetworkError', 'MongoServerSelectionError']);

const logFailure = err => console.error(JSON.stringify({
  event: 'request_failed',
  code: err.code === 11000 ? 'MONGO_DUPLICATE' : /^P\d{4}$/.test(err.code || '') ? err.code : KNOWN_NAMES.has(err.name) ? err.name : 'UNEXPECTED',
}));

module.exports = (err, req, res, next) => {
  if (res.headersSent) return next(err);
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body' });
  if (err.status === 413) return res.status(413).json({ error: req.path.endsWith('/logo') ? 'Logo must be at most 2 MB' : 'Request body is too large' });
  if (err.status >= 400 && err.status < 500) return res.status(err.status).json({ error: err.message });
  if (err.status === 503 && err.safeAuthError === true) return res.status(503).json({ error: err.message });

  // MongoDB / Mongoose errors
  if (err.code === 11000 || err.code === 'P2002') return res.status(409).json({ error: 'Record already exists' });
  if (err.name === 'ValidationError' || err.name === 'CastError' || err.name === 'PrismaClientValidationError' || err.code === 'P2003') {
    logFailure(err);
    return res.status(400).json({ error: 'Invalid record data' });
  }
  if (err.name === 'MongoNetworkError' || err.name === 'MongoServerSelectionError' || ['P1001', 'P1002', 'P1008', 'P1017', 'P2024'].includes(err.code)) {
    return res.status(503).json({ error: 'Database temporarily unavailable. Please retry.' });
  }

  if (err.code === 'P2025') return res.status(404).json({ error: 'Not found' });
  if (err.code === 'P2034') return res.status(409).json({ error: 'Record changed. Please retry.' });

  logFailure(err);
  res.status(500).json({ error: 'Unexpected server error' });
};
