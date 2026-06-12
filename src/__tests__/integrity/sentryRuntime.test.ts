import {
  buildSentryInitOptions,
  getPublicSentryDsn,
  getServerSentryDsn,
  isSentryEnabledForClient,
  isSentryEnabledForServer,
  resolveSentryEnvironment,
  scrubSentryEvent,
} from '@/lib/observability/sentryRuntime';

describe('sentry runtime (8d)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('is disabled outside production even when DSN is set', () => {
    process.env.NODE_ENV = 'development';
    process.env.NEXT_PUBLIC_SENTRY_DSN = 'https://example@o0.ingest.sentry.io/1';
    process.env.SENTRY_DSN = 'https://example@o0.ingest.sentry.io/1';

    expect(isSentryEnabledForClient()).toBe(false);
    expect(isSentryEnabledForServer()).toBe(false);
  });

  it('is enabled in production when DSN is configured', () => {
    process.env.NODE_ENV = 'production';
    process.env.NEXT_PUBLIC_SENTRY_DSN = 'https://example@o0.ingest.sentry.io/1';

    expect(isSentryEnabledForClient()).toBe(true);
    expect(isSentryEnabledForServer()).toBe(true);
    expect(getPublicSentryDsn()).toBe('https://example@o0.ingest.sentry.io/1');
    expect(getServerSentryDsn()).toBe('https://example@o0.ingest.sentry.io/1');
  });

  it('buildSentryInitOptions uses errors-only baseline settings', () => {
    process.env.NODE_ENV = 'production';
    process.env.NEXT_PUBLIC_SENTRY_DSN = 'https://example@o0.ingest.sentry.io/1';
    process.env.SENTRY_ENVIRONMENT = 'hosted-alpha';

    const options = buildSentryInitOptions('server');
    expect(options.enabled).toBe(true);
    expect(options.tracesSampleRate).toBe(0);
    expect(options.sendDefaultPii).toBe(false);
    expect(options.environment).toBe('hosted-alpha');
    expect(resolveSentryEnvironment()).toBe('hosted-alpha');
  });

  it('scrubSentryEvent redacts secrets and sensitive headers', () => {
    const scrubbed = scrubSentryEvent({
      message: 'api_key=super-secret-token',
      request: {
        headers: {
          cookie: 'session=abc',
          accept: 'application/json',
        },
        query_string: 'token=secret-value',
      },
      exception: {
        values: [{ value: '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----' }],
      },
    });

    expect(scrubbed?.message).toBe('[REDACTED]');
    expect(scrubbed?.request?.headers).toEqual({ accept: 'application/json' });
    expect(scrubbed?.request?.query_string).toContain('[REDACTED]');
    expect(scrubbed?.exception?.values?.[0]?.value).toContain('[REDACTED]');
    expect(scrubbed?.exception?.values?.[0]?.value).not.toContain('abc');
  });
});
