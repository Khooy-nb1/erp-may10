'use strict';

/**
 * Log sanitisation for the Sales module.
 *
 * Security checklist ("no secrets in logs"): messages are scrubbed of tokens,
 * passwords and connection strings before they reach the process log.
 */

const SENSITIVE_PATTERNS = [
  /password\s*[:=]\s*['"]?[^\s,'"]+/gi,
  /password\s+(?:was|is)\s+[^,\n\r]+/gi,
  /bearer\s+[a-zA-Z0-9._-]+/gi,
  /token\s*[:=]\s*['"]?[^\s,'"]+/gi,
  /postgres(?:ql)?:\/\/[^@\s]+@/gi,
  /secret(?:_user)?\b/gi,
  /jwt_secret\s*[:=]\s*['"]?[^\s,'"]+/gi,
];

function sanitizeLogString(input) {
  let sanitized = input;
  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  }
  return sanitized;
}

function logError(event, meta = {}) {
  const sanitizedMeta = {};
  for (const [key, value] of Object.entries(meta)) {
    sanitizedMeta[key] = typeof value === 'string' ? sanitizeLogString(value) : value;
  }
  console.error(`[${event}]`, sanitizedMeta);
}

module.exports = { sanitizeLogString, logError };
