import jwt from 'jsonwebtoken';

/**
 * Auth Middleware - Tương đương [Authorize] attribute trong ASP.NET
 */
export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ Success: false, Message: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  const secretKey =
    process.env.JWT_SECRET_KEY || 'ShopHangTet_DefaultSecretKey_2024_MongoDB_VerySecureKey123456789';

  try {
    const decoded = jwt.verify(token, secretKey, {
      issuer: process.env.JWT_ISSUER || 'ShopHangTet',
      audience: process.env.JWT_AUDIENCE || 'ShopHangTet.Client',
    });
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ Success: false, Message: 'Invalid or expired token.' });
  }
}

/**
 * Role-based authorization - Tương đương [Authorize(Roles = "...")] 
 */
export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ Success: false, Message: 'Access denied. Not authenticated.' });
    }
    if (roles.length > 0 && !roles.includes(req.user.role)) {
      return res.status(403).json({ Success: false, Message: 'Access denied. Insufficient permissions.' });
    }
    next();
  };
}
