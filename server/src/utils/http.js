// Small helpers so route files stay readable.
const httpError = (status, message) => Object.assign(new Error(message), { status });

// Forwards rejected promises to the Express error middleware.
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { httpError, asyncHandler };
