const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  try {
    const authorization = String(req.headers.authorization || '');
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    if (!match) return res.status(401).json({ error: 'Authentication required' });

    const payload = jwt.verify(match[1], process.env.JWT_SECRET, {
      issuer: 'metroflow-api',
      audience: 'metroflow-client'
    });

    if (payload.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired authentication token' });
  }
};
