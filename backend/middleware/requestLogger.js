const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * Request logging middleware
 * Logs incoming requests and their responses with timing information
 */
const requestLogger = (req, res, next) => {
  // Generate unique request ID
  req.id = uuidv4();

  // Store request start time
  const startTime = Date.now();

  // Log incoming request
  logger.info('Incoming request', {
    requestId: req.id,
    method: req.method,
    url: req.originalUrl || req.url,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent')
  });

  // Capture the original end function
  const originalEnd = res.end;

  // Override res.end to log response
  res.end = function (chunk, encoding) {
    // Calculate response time
    const duration = Date.now() - startTime;

    // Log response
    const logLevel = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

    logger[logLevel]('Request completed', {
      requestId: req.id,
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection.remoteAddress
    });

    // Call original end function
    originalEnd.call(this, chunk, encoding);
  };

  next();
};

/**
 * Error request logger
 * Logs detailed error information for failed requests
 */
const errorLogger = (err, req, res, next) => {
  logger.error('Request error', {
    requestId: req.id,
    method: req.method,
    url: req.originalUrl || req.url,
    error: {
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      name: err.name
    },
    ip: req.ip || req.connection.remoteAddress
  });

  next(err);
};

module.exports = { requestLogger, errorLogger };
