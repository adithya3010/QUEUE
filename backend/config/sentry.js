const Sentry = require('@sentry/node');
const { ProfilingIntegration } = require('@sentry/profiling-node');

/**
 * Initialize Sentry for error tracking and performance monitoring
 * Only enabled in production or when explicitly configured
 */
const initSentry = (app) => {
  // Only initialize if DSN is provided and not in test environment
  if (!process.env.SENTRY_DSN || process.env.NODE_ENV === 'test') {
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',

    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0, // 10% in prod, 100% in dev

    // Profiling
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    integrations: [
      // Enable HTTP calls tracing
      new Sentry.Integrations.Http({ tracing: true }),
      // Enable Express.js middleware tracing
      new Sentry.Integrations.Express({ app }),
      // Profiling integration
      new ProfilingIntegration(),
    ],

    // Filter out sensitive data
    beforeSend(event, hint) {
      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
      }

      // Remove sensitive data from request body
      if (event.request?.data) {
        const data = event.request.data;
        if (typeof data === 'object') {
          delete data.password;
          delete data.token;
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
    ],
  });

  console.log('Sentry initialized for error tracking');
};

/**
 * Sentry request handler - must be the first middleware
 */
const requestHandler = () => {
  if (!process.env.SENTRY_DSN || process.env.NODE_ENV === 'test') {
    return (req, res, next) => next();
  }
  return Sentry.Handlers.requestHandler();
};

/**
 * Sentry tracing handler - for performance monitoring
 */
const tracingHandler = () => {
  if (!process.env.SENTRY_DSN || process.env.NODE_ENV === 'test') {
    return (req, res, next) => next();
  }
  return Sentry.Handlers.tracingHandler();
};

/**
 * Sentry error handler - must be after all controllers but before other error handlers
 */
const errorHandler = () => {
  if (!process.env.SENTRY_DSN || process.env.NODE_ENV === 'test') {
    return (err, req, res, next) => next(err);
  }
  return Sentry.Handlers.errorHandler({
    shouldHandleError(error) {
      // Capture all errors with status code >= 500
      if (error.status >= 500) {
        return true;
      }
      // Capture specific error types
      if (error.name === 'DatabaseError' || error.name === 'ValidationError') {
        return true;
      }
      return false;
    },
  });
};

/**
 * Manually capture an exception
 */
const captureException = (error, context = {}) => {
  if (!process.env.SENTRY_DSN || process.env.NODE_ENV === 'test') {
    return;
  }
  Sentry.captureException(error, {
    extra: context,
  });
};

/**
 * Manually capture a message
 */
const captureMessage = (message, level = 'info', context = {}) => {
  if (!process.env.SENTRY_DSN || process.env.NODE_ENV === 'test') {
    return;
  }
  Sentry.captureMessage(message, {
    level,
    extra: context,
  });
};

module.exports = {
  initSentry,
  requestHandler,
  tracingHandler,
  errorHandler,
  captureException,
  captureMessage,
};
