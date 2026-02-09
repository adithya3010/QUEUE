/**
 * Centralized error handling middleware
 * Catches all errors and sends appropriate responses
 */
const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  // Log error details (errorLogger middleware already logged basic info)
  // This provides additional context for debugging

  // Default error status and message
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: Object.values(err.errors).map(e => ({
        field: e.path,
        message: e.message
      }))
    });
  }

  // Mongoose cast errors (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format'
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }

  // Send error response
  res.status(status).json({
    success: false,
    message: process.env.NODE_ENV === 'production' && status === 500
      ? 'Internal server error'
      : message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// 404 error handler for undefined routes
const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
};

module.exports = { errorHandler, notFoundHandler };
