import * as Sentry from '@sentry/nextjs';
import { replayIntegration } from '@sentry/browser';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const tracesSampleRate = Number(
  process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ||
    (process.env.NODE_ENV === 'production' ? '0.05' : '1')
);
const replaySessionSampleRate = Number(
  process.env.NEXT_PUBLIC_SENTRY_REPLAY_SESSION_SAMPLE_RATE || '0.01'
);
const replayErrorSampleRate = Number(
  process.env.NEXT_PUBLIC_SENTRY_REPLAY_ERROR_SAMPLE_RATE || '1'
);
const replayEnabled = process.env.NEXT_PUBLIC_SENTRY_REPLAY_ENABLED === 'true';

function scrubEvent(event: Sentry.ErrorEvent): Sentry.ErrorEvent {
  if (event.request?.headers) {
    delete event.request.headers.authorization;
    delete event.request.headers.cookie;
  }

  return event;
}

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment:
    process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ||
    process.env.NEXT_PUBLIC_VERCEL_ENV ||
    process.env.NODE_ENV,
  release:
    process.env.NEXT_PUBLIC_SENTRY_RELEASE ||
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
  tracesSampleRate,
  enableLogs: process.env.NEXT_PUBLIC_SENTRY_ENABLE_LOGS === 'true',
  sendDefaultPii: false,
  beforeSend: scrubEvent,
  initialScope: (scope) => {
    scope.setTag('service', 'desktop-app');
    scope.setTag('runtime', 'browser');
    return scope;
  },
  integrations: replayEnabled
    ? [
        replayIntegration({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ]
    : [],
  replaysSessionSampleRate: replayEnabled ? replaySessionSampleRate : 0,
  replaysOnErrorSampleRate: replayEnabled ? replayErrorSampleRate : 0,
});
