import winston from 'winston';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Centralized Logger for all microservices
 * Uses Winston for structured logging with multiple transports
 */

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log colors for console output
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(colors);

// Determine log level based on environment
const level = (): string => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'info';
};

// Define format for file logs (no colors)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.printf(
    (info) => `${info.timestamp} [${info.level.toUpperCase()}]: ${info.message}`
  )
);

// Define format for console logs (with colors)
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} [${info.level}]: ${info.message}`
  )
);

// Define transports
const transports: winston.transport[] = [
  // Console transport with colors
  new winston.transports.Console({
    format: consoleFormat,
  }),
  
  // File transport for errors (no colors)
  new winston.transports.File({
    filename: path.join(logsDir, 'error.log'),
    level: 'error',
    format: fileFormat,
  }),
  
  // File transport for all logs (no colors)
  new winston.transports.File({
    filename: path.join(logsDir, 'all.log'),
    format: fileFormat,
  }),
];

// Create the logger
const Logger = winston.createLogger({
  level: level(),
  levels,
  transports,
  exitOnError: false,
});

/**
 * Structured logging helper functions
 */
export const logger = {
  /**
   * Log error messages
   */
  error: (message: string, meta?: Record<string, unknown>): void => {
    Logger.error(message, meta);
  },

  /**
   * Log warning messages
   */
  warn: (message: string, meta?: Record<string, unknown>): void => {
    Logger.warn(message, meta);
  },

  /**
   * Log info messages
   */
  info: (message: string, meta?: Record<string, unknown>): void => {
    Logger.info(message, meta);
  },

  /**
   * Log HTTP requests
   */
  http: (message: string, meta?: Record<string, unknown>): void => {
    Logger.http(message, meta);
  },

  /**
   * Log debug messages (development only)
   */
  debug: (message: string, meta?: Record<string, unknown>): void => {
    Logger.debug(message, meta);
  },
};

export default logger;