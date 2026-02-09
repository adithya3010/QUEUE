import * as Sentry from '@sentry/react';

/**
 * Initialize Sentry for frontend error tracking and performance monitoring
 * Only enabled when SENTRY_DSN is configured
 */
export const initSentry = () => {
  // Only initialize if DSN is provided
  const sentryDsn = import.meta.env.VITE_SENTRY_DSN;

  if (!sentryDsn) {
    console.log('Sentry DSN not configured, skipping initialization');
    return;
  }

  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,

    // Performance monitoring
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // Performance Monitoring
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0, // 10% in production, 100% in development

    // Session Replay
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

    // Filter out sensitive data
    beforeSend(event, hint) {
      // Remove sensitive data from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map(breadcrumb => {
          if (breadcrumb.data) {
            delete breadcrumb.data.password;
            delete breadcrumb.data.token;
          }
          return breadcrumb;
        });
      }

      // Remove sensitive request data
      if (event.request) {
        delete event.request.cookies;
        if (event.request.data) {
          const data = event.request.data;
          if (typeof data === 'object') {
            delete data.password;
            delete data.token;
          }
        }
      }

      return event;
    },

    // Ignore specific errors
    ignoreErrors: [
      'Non-Error promise rejection captured',
      'ResizeObserver loop limit exceeded',
      'Network Error',
      'NetworkError',
      'ChunkLoadError',
      'Loading chunk',
      'Failed to fetch',
    ],

    // Don't report errors from browser extensions
    denyUrls: [
      /extensions\//i,
      /^chrome:\/\//i,
      /^moz-extension:\/\//i,
    ],
  });

  console.log('Sentry initialized for error tracking');
};

/**
 * Manually capture an exception
 */
export const captureException = (error, context = {}) => {
  const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
  if (!sentryDsn) return;

  Sentry.captureException(error, {
    extra: context,
  });
};

/**
 * Manually capture a message
 */
export const captureMessage = (message, level = 'info', context = {}) => {
  const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
  if (!sentryDsn) return;

  Sentry.captureMessage(message, {
    level,
    extra: context,
  });
};

/**
 * Set user context for Sentry
 */
export const setUser = (user) => {
  const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
  if (!sentryDsn) return;

  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.name,
    });
  } else {
    Sentry.setUser(null);
  }
};

/**
 * Add breadcrumb for debugging
 */
export const addBreadcrumb = (message, data = {}) => {
  const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
  if (!sentryDsn) return;

  Sentry.addBreadcrumb({
    message,
    data,
    level: 'info',
  });
};
