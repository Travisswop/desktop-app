/**
 * Custom logger utility for Next.js application
 * Provides different log levels with environment-aware formatting
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug' | 'log';

// Determine if we're in development mode
const isDev = process.env.NODE_ENV !== 'production';

// ANSI color codes for terminal output in development
const colors = {
  info: '\x1b[36m', // Cyan
  warn: '\x1b[33m', // Yellow
  error: '\x1b[31m', // Red
  debug: '\x1b[35m', // Magenta
  log: '\x1b[32m', // Green
  reset: '\x1b[0m', // Reset
};

// Format the log message based on environment and level
const formatLog = (level: LogLevel, message: any, ...args: any[]) => {
  const timestamp = new Date().toISOString();

  if (isDev) {
    // In development, use colors and detailed logging
    const color = colors[level];
    return [
      `${color}[${level.toUpperCase()}]${colors.reset} ${timestamp}:`,
      message,
      ...args,
    ];
  } else {
    // In production, use a more compact format
    return [
      `[${level.toUpperCase()}] ${timestamp}:`,
      message,
      ...args,
    ];
  }
};

// Create the logger object with all required methods
const logger = {
  info: (message: any, ...args: any[]) => {
    console.info(...formatLog('info', message, ...args));
  },

  warn: (message: any, ...args: any[]) => {
    console.warn(...formatLog('warn', message, ...args));
  },

  error: (message: any, ...args: any[]) => {
    console.error(...formatLog('error', message, ...args));
  },

  debug: (message: any, ...args: any[]) => {
    // Only log debug messages in development
    if (isDev) {
      console.debug(...formatLog('debug', message, ...args));
    }
  },

  log: (message: any, ...args: any[]) => {
    console.log(...formatLog('log', message, ...args));
  },
};

export default logger;
