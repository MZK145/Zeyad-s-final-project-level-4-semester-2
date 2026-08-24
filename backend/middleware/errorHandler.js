module.exports = (error, _req, res, _next) => {
  const status = Number(error?.statusCode || 500);
  if (status < 500) {
    return res.status(status).json({ error: error?.message || 'Request failed' });
  }

  console.error(error);
  if (error?.code === 11000) return res.status(409).json({ error: 'A duplicate record already exists' });
  res.status(status).json({ error: error?.message || 'Server error' });
};
