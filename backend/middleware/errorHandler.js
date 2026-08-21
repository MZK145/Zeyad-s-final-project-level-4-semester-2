module.exports = (error, _req, res, _next) => {
  console.error(error);
  if (error?.code === 11000) return res.status(409).json({ error: 'A duplicate record already exists' });
  res.status(error?.statusCode || 500).json({ error: error?.message || 'Server error' });
};
