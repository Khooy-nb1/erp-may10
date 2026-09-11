const SENSITIVE_PATTERNS: RegExp[] = [
  /password\s*[:=]\s*['"]?[^\s,'"]+/gi,
  /password\s+(?:was|is)\s+[^,\n\r]+/gi,
  /bearer\s+[a-zA-Z0-9._-]+/gi,
  /token\s*[:=]\s*['"]?[^\s,'"]+/gi,
  /postgres(?:ql)?:\/\/[^@\s]+@/gi,
  /secret(?:_user)?\b/gi,
  /jwt_secret\s*[:=]\s*['"]?[^\s,'"]+/gi,
];

export function sanitizeLogString(input: string): string {
  let sanitized = input;
  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  }
  return sanitized;
}

export function logError(event: string, meta: Record<string, unknown>): void {
  const sanitizedMeta: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (typeof value === 'string') {
      sanitizedMeta[key] = sanitizeLogString(value);
    } else {
      sanitizedMeta[key] = value;
    }
  }
  console.error(`[${event}]`, sanitizedMeta);
}
