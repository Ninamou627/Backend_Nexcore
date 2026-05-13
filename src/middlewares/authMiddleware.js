const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
  let token;

  // Check for token in cookies
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } 
  
  console.log(`[AuthMiddleware] Path: ${req.path}`);
  console.log(`[AuthMiddleware] Token from cookie: ${token ? 'Present' : 'Missing'}`);
  console.log(`[AuthMiddleware] Auth header: ${req.headers.authorization ? 'Present' : 'Missing'}`);

  // Fallback to headers (for backward compatibility during migration)
  if (!token && 
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token || token === 'null' || token === 'undefined') {
    return res.status(401).json({ message: 'Non autorisé, pas de token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error(error);
    res.status(401).json({ message: 'Non autorisé, token invalide' });
  }
};

const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Accès refusé. Rôle insuffisant.' });
    }
    next();
  };
};

module.exports = { protect, restrictTo };
