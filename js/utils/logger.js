/**
 * Logger Utility
 * Provides consistent logging with different levels and outputs
 */

import { LOGGING_CONFIG, ENV } from '../config/index.js';

/**
 * Log levels
 */
export const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  FATAL: 4
};

/**
 * Log level names for display
 */
const LOG_LEVEL_NAMES = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
  [LogLevel.FATAL]: 'FATAL'
};

/**
 * Logger class
 */
export class Logger {
  constructor(name = 'App', config = LOGGING_CONFIG) {
    this.name = name;
    this.config = config;
    this.level = this.parseLevel(config.level);
  }

  /**
     * Parse log level from string
     * @param {string} level - Log level string
     * @returns {number} Log level number
     */
  parseLevel(level) {
    const levels = {
      'debug': LogLevel.DEBUG,
      'info': LogLevel.INFO,
      'warn': LogLevel.WARN,
      'error': LogLevel.ERROR,
      'fatal': LogLevel.FATAL
    };
    return levels[level.toLowerCase()] || LogLevel.INFO;
  }

  /**
     * Check if should log based on level
     * @param {number} level - Log level to check
     * @returns {boolean} Whether to log
     */
  shouldLog(level) {
    return level >= this.level;
  }

  /**
     * Format log message
     * @param {number} level - Log level
     * @param {string} message - Log message
     * @param {Object} context - Additional context
     * @returns {Object} Formatted log entry
     */
  formatMessage(level, message, context = {}) {
    return {
      timestamp: new Date().toISOString(),
      level: LOG_LEVEL_NAMES[level],
      logger: this.name,
      message,
      ...context,
      url: window.location.href,
      userAgent: navigator.userAgent
    };
  }

  /**
     * Log to console
     * @param {Object} logEntry - Formatted log entry
     */
  logToConsole(logEntry) {
    if (!this.config.enableConsole) {return;}

    const { level, message, ...context } = logEntry;
    const prefix = `[${logEntry.timestamp}] [${level}] [${this.name}]`;

    switch (level) {
    case LOG_LEVEL_NAMES[LogLevel.DEBUG]:
      console.debug(prefix, message, context);
      break;
    case LOG_LEVEL_NAMES[LogLevel.INFO]:
      console.info(prefix, message, context);
      break;
    case LOG_LEVEL_NAMES[LogLevel.WARN]:
      console.warn(prefix, message, context);
      break;
    case LOG_LEVEL_NAMES[LogLevel.ERROR]:
    case LOG_LEVEL_NAMES[LogLevel.FATAL]:
      console.error(prefix, message, context);
      break;
    }
  }

  /**
     * Log to remote server
     * @param {Object} logEntry - Formatted log entry
     */
  async logToRemote(logEntry) {
    if (!this.config.enableRemote || !ENV.isProduction) {return;}

    try {
      await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(logEntry)
      });
    } catch (error) {
      // Fail silently to avoid infinite loop
      console.error('Failed to send log to remote:', error);
    }
  }

  /**
     * Generic log method
     * @param {number} level - Log level
     * @param {string} message - Log message
     * @param {Object} context - Additional context
     */
  log(level, message, context = {}) {
    if (!this.shouldLog(level)) {return;}

    const logEntry = this.formatMessage(level, message, context);

    this.logToConsole(logEntry);

    // Only send errors and fatals to remote
    if (level >= LogLevel.ERROR) {
      this.logToRemote(logEntry);
    }
  }

  /**
     * Debug log
     * @param {string} message - Log message
     * @param {Object} context - Additional context
     */
  debug(message, context = {}) {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
     * Info log
     * @param {string} message - Log message
     * @param {Object} context - Additional context
     */
  info(message, context = {}) {
    this.log(LogLevel.INFO, message, context);
  }

  /**
     * Warning log
     * @param {string} message - Log message
     * @param {Object} context - Additional context
     */
  warn(message, context = {}) {
    this.log(LogLevel.WARN, message, context);
  }

  /**
     * Error log
     * @param {string} message - Log message
     * @param {Object|Error} context - Additional context or error object
     */
  error(message, context = {}) {
    if (context instanceof Error) {
      context = {
        error: {
          message: context.message,
          stack: context.stack,
          name: context.name
        }
      };
    }
    this.log(LogLevel.ERROR, message, context);
  }

  /**
     * Fatal log
     * @param {string} message - Log message
     * @param {Object|Error} context - Additional context or error object
     */
  fatal(message, context = {}) {
    if (context instanceof Error) {
      context = {
        error: {
          message: context.message,
          stack: context.stack,
          name: context.name
        }
      };
    }
    this.log(LogLevel.FATAL, message, context);
  }

  /**
     * Time a function execution
     * @param {string} label - Timer label
     * @param {Function} fn - Function to time
     * @returns {*} Function result
     */
  async time(label, fn) {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      this.debug(`${label} completed`, { duration: `${duration.toFixed(2)}ms` });
      return result;
    } catch (_error) {
      const duration = performance.now() - start;
      this.error(`${label} failed`, {
        duration: `${duration.toFixed(2)}ms`,
        error: _error
      });
      throw _error;
    }
  }

  /**
     * Create a child logger with a new name
     * @param {string} name - Child logger name
     * @returns {Logger} Child logger instance
     */
  child(name) {
    return new Logger(`${this.name}:${name}`, this.config);
  }
}

/**
 * Create default logger instance
 */
export const logger = new Logger();

/**
 * Create logger for specific module
 * @param {string} name - Module name
 * @returns {Logger} Logger instance
 */
export function createLogger(name) {
  return new Logger(name);
}

/**
 * Performance timing helper
 * @param {string} label - Performance mark label
 */
export function startTiming(label) {
  if (window.performance && window.performance.mark) {
    performance.mark(`${label}-start`);
  }
}

/**
 * End performance timing and log result
 * @param {string} label - Performance mark label
 * @param {Logger} log - Logger instance to use
 */
export function endTiming(label, log = logger) {
  if (window.performance && window.performance.mark && window.performance.measure) {
    performance.mark(`${label}-end`);
    try {
      performance.measure(label, `${label}-start`, `${label}-end`);
      const measure = performance.getEntriesByName(label)[0];
      if (measure) {
        log.debug(`Performance: ${label}`, {
          duration: `${measure.duration.toFixed(2)}ms`
        });
      }
    } catch (_error) {
      // Ignore errors in performance measurement
    }
  }
}
