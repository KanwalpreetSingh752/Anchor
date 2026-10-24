import { config, asyncHandler, createLogger, User } from '@anchor/shared';
import * as authService from './auth.service.js';

const logger = createLogger('auth-controller');

const REFRESH_COOKIE_NAME = 'refreshToken';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
};

// ─── Handlers ─────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 */
export const registerHandler = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const { user, accessToken, refreshToken } = await authService.register(email, password);

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, COOKIE_OPTIONS);

  res.status(201).json({
    success: true,
    data: { user, accessToken },
  });
});

/**
 * POST /api/auth/login
 */
export const loginHandler = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const { user, accessToken, refreshToken } = await authService.login(email, password);

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, COOKIE_OPTIONS);

  res.json({
    success: true,
    data: { user, accessToken },
  });
});

/**
 * POST /api/auth/refresh
 * Reads refresh token from HTTP-only cookie and issues a new token pair.
 */
export const refreshHandler = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

  if (!refreshToken) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Refresh token cookie is missing.' },
    });
  }

  const { accessToken, refreshToken: newRefreshToken } = await authService.refresh(refreshToken);

  res.cookie(REFRESH_COOKIE_NAME, newRefreshToken, COOKIE_OPTIONS);

  res.json({
    success: true,
    data: { accessToken },
  });
});

/**
 * POST /api/auth/logout
 * Clears the refresh token cookie and removes it from the DB.
 */
export const logoutHandler = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

  if (refreshToken && req.user) {
    await authService.logout(req.user.id, refreshToken);
  }

  res.clearCookie(REFRESH_COOKIE_NAME, { httpOnly: true, sameSite: 'strict' });

  res.json({
    success: true,
    data: { message: 'Logged out successfully.' },
  });
});

/**
 * GET /api/auth/me
 * Returns the currently authenticated user's profile.
 */
export const getMeHandler = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).lean();

  if (!user) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'User not found.' },
    });
  }

  // Manually build safe response (passwordHash excluded by toJSON, but we're using lean())
  const safeUser = {
    id: user._id.toString(),
    email: user.email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  res.json({
    success: true,
    data: { user: safeUser },
  });
});
