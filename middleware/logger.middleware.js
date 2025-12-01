// middlewares/logger.middleware.js
const logger = require('../config/logger.config');

const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Log the request
  logger.http(`${req.method} ${req.originalUrl} - Request started`);
  
  // Log request body (excluding sensitive data)
  if (req.body && Object.keys(req.body).length > 0) {
    const logBody = { ...req.body };
    
    // Remove sensitive fields from logs
    if (logBody.password) logBody.password = '[REDACTED]';
    if (logBody.confirmPassword) logBody.confirmPassword = '[REDACTED]';
    if (logBody.creditCard) logBody.creditCard = '[REDACTED]';
    if (logBody.cvv) logBody.cvv = '[REDACTED]';
    
    logger.debug(`Request Body: ${JSON.stringify(logBody)}`);
  }
  
  // Log request query parameters
  if (req.query && Object.keys(req.query).length > 0) {
    logger.debug(`Query Params: ${JSON.stringify(req.query)}`);
  }
  
  // Log response
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'http';
    
    logger[logLevel](
      `${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`
    );
  });
  
  next();
};

module.exports = requestLogger;