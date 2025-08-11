import morgan from 'morgan';
const chalk = require('chalk');
import fs from 'fs';
import path from 'path';

// Log levels
type LogLevel = 'info' | 'warn' | 'error';

// Log file path (ensure directory exists)
const logFilePath = path.join(__dirname, '../logs/app.log');

if (!fs.existsSync(path.dirname(logFilePath))) {
  fs.mkdirSync(path.dirname(logFilePath), { recursive: true });
}

// Helper: Write to local file
const logToFile = (
  level: LogLevel,
  message: string,
  meta: Record<string, unknown> = {},
) => {
  const logEntry = `[${new Date().toISOString()}] [${level.toUpperCase()}] ${message} ${JSON.stringify(meta)}\n`;
  fs.appendFile(logFilePath, logEntry, err => {
    if (err) console.error('Failed to write log to file:', err);
  });
};

// Console color by level
const getConsoleColor = (level: LogLevel) => {
  switch (level) {
    case 'info':
      return chalk.blue;
    case 'warn':
      return chalk.yellow;
    case 'error':
      return chalk.red;
    default:
      return chalk.white;
  }
};

// Main logger
export const logger = {
  log: (
    level: LogLevel,
    message: string,
    meta: Record<string, unknown> = {},
  ) => {
    const color = getConsoleColor(level);
    console.log(color(`[${level.toUpperCase()}] ${message}`), meta);

    // Write to local file
    logToFile(level, message, meta);
  },

  info: (message: string, meta: Record<string, unknown> = {}) =>
    logger.log('info', message, meta),
  warn: (message: string, meta: Record<string, unknown> = {}) =>
    logger.log('warn', message, meta),
  error: (message: string, meta: Record<string, unknown> = {}) =>
    logger.log('error', message, meta),
};

// Morgan stream for HTTP logs
export const morganStream = {
  write: (message: string) => {
    const trimmedMessage = message.trim();
    console.log(chalk.green(`[HTTP] ${trimmedMessage}`));

    // Write to local file
    logToFile('info', '[HTTP]', { message: trimmedMessage });
  },
};

// Morgan middleware
export const morganMiddleware = morgan('combined', { stream: morganStream });
