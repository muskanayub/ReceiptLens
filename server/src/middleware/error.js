module.exports = function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  let status = err.status || 500;
  let message = err.message || 'Server error';

  if (err.name === 'CastError' || err.name === 'ValidationError') status = 400;
  if (err.name === 'MulterError') {
    status = 400;
    if (err.code === 'LIMIT_FILE_SIZE') message = 'File is larger than 10 MB';
  }

  if (status >= 500 && !err.status) console.error(err);
  res.status(status).json({ error: status === 500 ? 'Something went wrong on the server' : message });
};
