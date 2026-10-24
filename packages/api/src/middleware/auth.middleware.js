import jwt from 'jsonwebtoken';
import { config, createLogger, User } from '@anchor/shared';

const logger = createLogger('auth-middleware');

/**
 * Extracts and verifies a Bearer JWT from the Authorization header.
 * Attaches `req.user = { id, email }` on success.
 * Returns HTTP 401 if the token is missing, malformed, or expired.
 */
export async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication token is required.' },
    });
  }

  const token = authHeader.slice(7); // strip "Bearer "

  try {
    const payload = jwt.verify(token, config.ACCESS_TOKEN_SECRET);

    if (payload.type !== 'access') {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid token type.' },
      });
    }

    // Lightweight user lookup to ensure account still exists
    const user = await User.findById(payload.sub).lean();
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not found.' },
      });
    }

    req.user = { id: payload.sub, email: user.email };
    next();
  } catch (err) {
    logger.debug({ err: err.message }, 'JWT verification failed');

    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: { code: 'TOKEN_EXPIRED', message: 'Authentication token has expired.' },
      });
    }

    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Invalid authentication token.' },
    });
  }
}
