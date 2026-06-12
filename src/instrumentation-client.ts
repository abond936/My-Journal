import * as Sentry from '@sentry/nextjs';
import { buildSentryInitOptions } from '@/lib/observability/sentryRuntime';

Sentry.init(buildSentryInitOptions('client'));

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
