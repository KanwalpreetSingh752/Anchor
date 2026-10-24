import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config, createLogger, User } from '@anchor/shared';

const logger = createLogger('auth-service');

const BCRYPT_ROUNDS = 12;

// ─── Token Helpers ────────────────────────────────────────────────────────────

/**
 * Generates a signed access token (short-lived) and a signed refresh token
 * (long-lived). Stores the refresh token hash in the user's document.
 *
 * @param {string} userId - MongoDB ObjectId string
 * @returns {{ accessToken: string, refreshToken: string }}
 */
export async function generateTokens(userId) {
  const accessToken = jwt.sign(
    { sub: userId, type: 'access' },
    config.ACCESS_TOKEN_SECRET,
    { expiresIn: config.ACCESS_TOKEN_EXPIRY },
  );

  const refreshToken = jwt.sign(
    { sub: userId, type: 'refresh' },
    config.REFRESH_TOKEN_SECRET,
    { expiresIn: config.REFRESH_TOKEN_EXPIRY },
  );

  // Determine expiry date for storage (parse the JWT expiry string)
  const decoded = jwt.decode(refreshToken);
  const expiresAt = new Date(decoded.exp * 1000);

  // Append new refresh token to the user's token list
  await User.findByIdAndUpdate(userId, {
    $push: {
      refreshTokens: { token: refreshToken, expiresAt },
    },
  });

  return { accessToken, refreshToken };
}

// ─── Auth Operations ──────────────────────────────────────────────────────────

/**
 * Registers a new user.
 * @param {string} email
 * @param {string} password
 * @returns {{ user: object, accessToken: string, refreshToken: string }}
 */
export async function register(email, password) {
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    const err = new Error('An account with this email already exists.');
    err.statusCode = 409;
    err.code = 'EMAIL_IN_USE';
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = await User.create({ email, passwordHash });

  logger.info({ userId: user._id }, 'New user registered');

  const { accessToken, refreshToken } = await generateTokens(user._id.toString());

  return { user: user.toJSON(), accessToken, refreshToken };
}

/**
 * Authenticates a user with email + password.
 * @param {string} email
 * @param {string} password
 * @returns {{ user: object, accessToken: string, refreshToken: string }}
 */
export async function login(email, password) {
  // Fetch user including passwordHash (not exposed in toJSON)
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');

  if (!user) {
    const err = new Error('Invalid email or password.');
    err.statusCode = 401;
    err.code = 'INVALID_CREDENTIALS';
    throw err;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    const err = new Error('Invalid email or password.');
    err.statusCode = 401;
    err.code = 'INVALID_CREDENTIALS';
    throw err;
  }

  logger.info({ userId: user._id }, 'User logged in');

  const { accessToken, refreshToken } = await generateTokens(user._id.toString());

  return { user: user.toJSON(), accessToken, refreshToken };
}

/**
 * Issues new tokens by validating a refresh token (rotation).
 * @param {string} refreshToken
 * @returns {{ accessToken: string, refreshToken: string }}
 */
export async function refresh(refreshToken) {
  let payload;
  try {
    payload = jwt.verify(refreshToken, config.REFRESH_TOKEN_SECRET);
  } catch (err) {
    const e = new Error('Refresh token is invalid or expired.');
    e.statusCode = 401;
    e.code = 'INVALID_REFRESH_TOKEN';
    throw e;
  }

  if (payload.type !== 'refresh') {
    const err = new Error('Invalid token type.');
    err.statusCode = 401;
    err.code = 'INVALID_REFRESH_TOKEN';
    throw err;
  }

  // Verify token is still stored (not yet rotated / revoked)
  const user = await User.findOne({
    _id: payload.sub,
    'refreshTokens.token': refreshToken,
  });

  if (!user) {
    // Token reuse detected — revoke all sessions
    logger.warn({ sub: payload.sub }, 'Refresh token reuse detected — revoking all sessions');
    await revokeAllSessions(payload.sub);
    const err = new Error('Refresh token has been revoked.');
    err.statusCode = 401;
    err.code = 'INVALID_REFRESH_TOKEN';
    throw err;
  }

  // Rotate: remove the consumed token, issue new pair
  await User.findByIdAndUpdate(payload.sub, {
    $pull: { refreshTokens: { token: refreshToken } },
  });

  const tokens = await generateTokens(payload.sub);
  logger.debug({ userId: payload.sub }, 'Refresh token rotated');

  return tokens;
}

/**
 * Logs out a user by removing a single refresh token from their record.
 * @param {string} userId
 * @param {string} refreshToken
 */
export async function logout(userId, refreshToken) {
  await User.findByIdAndUpdate(userId, {
    $pull: { refreshTokens: { token: refreshToken } },
  });
  logger.info({ userId }, 'User logged out');
}

/**
 * Revokes all refresh tokens for a user (force sign-out from all devices).
 * @param {string} userId
 */
export async function revokeAllSessions(userId) {
  await User.findByIdAndUpdate(userId, { $set: { refreshTokens: [] } });
  logger.info({ userId }, 'All sessions revoked');
}
