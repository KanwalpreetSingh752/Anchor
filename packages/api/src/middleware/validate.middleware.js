/**
 * Middleware factory that validates `req.body` against a Zod schema.
 * On success, replaces `req.body` with the parsed (and potentially coerced) data.
 * On failure, returns HTTP 400 with structured field-level error details.
 *
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against.
 */
export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed.',
          details: fieldErrors,
        },
      });
    }

    req.body = result.data;
    next();
  };
}
