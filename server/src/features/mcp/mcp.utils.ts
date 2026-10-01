import crypto from 'node:crypto';

/**
 * Computes deterministic SHA-256 hash of a plaintext token.
 */
export const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
};

/**
 * Strips sensitive internal details (stack traces, DB strings, internal paths) from error messages
 * before returning them to the LLM context.
 */
export const sanitizeErrorMessage = (error: any): string => {
  if (!error) return 'An unexpected error occurred.';

  const message = error.message || String(error);

  const sanitized = message
    .replace(/mongodb(\+srv)?:\/\/[^\s]+/gi, '[DATABASE_URI_REDACTED]')
    .replace(/password[:=]\s*[^\s&]+/gi, 'password=[REDACTED]')
    .replace(/key[:=]\s*[^\s&]+/gi, 'key=[REDACTED]')
    .replace(/[a-zA-Z]:\\[^\n]+/g, '[INTERNAL_PATH_REDACTED]')
    .replace(/\/[a-zA-Z0-9_\-./]+\.(ts|js|json)/g, '[INTERNAL_PATH_REDACTED]');

  return sanitized.trim();
};
