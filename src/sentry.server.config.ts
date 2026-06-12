import * as Sentry from '@sentry/nextjs';
import { buildSentryInitOptions } from '@/lib/observability/sentryRuntime';

Sentry.init(buildSentryInitOptions('server'));
