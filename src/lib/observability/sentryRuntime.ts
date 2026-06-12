import type { ErrorEvent, EventHint } from '@sentry/nextjs';
import { redactSecretsInText } from '@/lib/scripts/utils/safeMaintenanceLog';

export function getPublicSentryDsn(): string | undefined {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();
  return dsn || undefined;
}

export function getServerSentryDsn(): string | undefined {
  const dsn =
    process.env.SENTRY_DSN?.trim() || process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();
  return dsn || undefined;
}

export function isSentryEnabledForClient(): boolean {
  return process.env.NODE_ENV === 'production' && Boolean(getPublicSentryDsn());
}

export function isSentryEnabledForServer(): boolean {
  return process.env.NODE_ENV === 'production' && Boolean(getServerSentryDsn());
}

export function resolveSentryEnvironment(): string {
  return (
    process.env.SENTRY_ENVIRONMENT?.trim() ||
    process.env.VERCEL_ENV?.trim() ||
    process.env.NODE_ENV ||
    'production'
  );
}

type SentryRuntime = 'client' | 'server' | 'edge';

export function buildSentryInitOptions(runtime: SentryRuntime) {
  const isClient = runtime === 'client';
  const dsn = isClient ? getPublicSentryDsn() : getServerSentryDsn();
  const enabled = isClient ? isSentryEnabledForClient() : isSentryEnabledForServer();

  return {
    dsn,
    enabled,
    environment: resolveSentryEnvironment(),
    tracesSampleRate: 0,
    sendDefaultPii: false,
    beforeSend: scrubSentryEvent,
  };
}

const SENSITIVE_HEADER_KEYS = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'x-auth-token',
]);

export function scrubSentryEvent(event: ErrorEvent, _hint?: EventHint): ErrorEvent | null {
  if (typeof event.message === 'string') {
    event.message = redactSecretsInText(event.message);
  }

  if (event.exception?.values) {
    for (const value of event.exception.values) {
      if (typeof value.value === 'string') {
        value.value = redactSecretsInText(value.value);
      }
    }
  }

  if (event.request?.headers) {
    const headers = { ...event.request.headers };
    for (const key of Object.keys(headers)) {
      if (SENSITIVE_HEADER_KEYS.has(key.toLowerCase())) {
        delete headers[key];
      }
    }
    event.request.headers = headers;
  }

  if (typeof event.request?.query_string === 'string') {
    event.request.query_string = redactSecretsInText(event.request.query_string);
  }

  return event;
}
