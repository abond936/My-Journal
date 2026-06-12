/**
 * Safe logging helpers for maintenance/operator scripts (post-review step 8b).
 * Never log secret values or key fragments — only presence, names, and redacted errors.
 */

export const FIREBASE_ADMIN_ENV_VARS = [
  'FIREBASE_SERVICE_ACCOUNT_PROJECT_ID',
  'FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL',
  'FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY',
] as const;

const SECRET_PATTERNS: RegExp[] = [
  /-----BEGIN[^-]+-----[\s\S]*?-----END[^-]+-----/g,
  /\bsk-[a-zA-Z0-9]{8,}\b/g,
  /\bAIza[0-9A-Za-z_-]{20,}\b/g,
  /(api[_-]?key\s*[:=]\s*)[^\s'"]+/gi,
  /(private[_-]?key\s*[:=]\s*)[^\s'"]+/gi,
  /(secret\s*[:=]\s*)[^\s'"]+/gi,
  /(token\s*[:=]\s*)[^\s'"]+/gi,
];

export function formatEnvPresence(value: string | undefined | null): 'Set' | 'Not set' {
  return value && value.trim().length > 0 ? 'Set' : 'Not set';
}

export function redactSecretsInText(text: string): string {
  let out = text;
  for (const pattern of SECRET_PATTERNS) {
    out = out.replace(pattern, '[REDACTED]');
  }
  return out;
}

export function safeMaintenanceErrorMessage(error: unknown, fallback = 'Unknown error'): string {
  if (error instanceof Error) {
    return redactSecretsInText(error.message);
  }
  if (typeof error === 'string') {
    return redactSecretsInText(error);
  }
  return fallback;
}

export function logRequiredEnvPresent(required: readonly string[]): void {
  const missing = required.filter((name) => !process.env[name]?.trim());
  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
  console.log('Required environment variables are present.');
}

export function logEnvPresence(labels: Record<string, string | undefined | null>): void {
  for (const [label, value] of Object.entries(labels)) {
    console.log(`${label}: ${formatEnvPresence(value)}`);
  }
}
