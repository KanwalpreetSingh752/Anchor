/**
 * Wraps an async Express route handler to automatically forward errors
 * to Express's next() error middleware, eliminating repetitive try/catch blocks.
 *
 * @param {function} fn - Async route handler (req, res, next) => Promise<void>
 * @returns {function} Express middleware
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
