import type { AppException } from '@repo/types';

/**
 * Log levels supported by the logger
 * Ordered by severity: debug < info < warn < error
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Payload structure sent to the centralized logging service
 * This format should match your monitoring web app's expectations
 */
export interface LogPayload {
  /** Name of the application sending the log */
  appName: string;
  /** Human-readable log message */
  message: string;
  /** Severity level */
  level: LogLevel;
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Additional context data */
  metadata?: Record<string, unknown>;
}

/**
 * Logger configuration options
 */
export interface LoggerConfig {
  /** Name of the application (appears in all logs) */
  appName: string;
  /** Color for console output (CSS color value) */
  color?: string;
  /** URL of centralized logging service (optional) */
  consoleUrl?: string;
  /** Minimum log level to output (default: 'debug') */
  minLevel?: LogLevel;
  /** Custom fetch function for testing or alternative HTTP clients */
  fetchFn?: typeof fetch;
}

/**
 * Logger instance interface
 */
export interface Logger {
  debug: (message: string, metadata?: Record<string, unknown>) => Promise<void>;
  info: (message: string, metadata?: Record<string, unknown>) => Promise<void>;
  warn: (message: string, metadata?: Record<string, unknown>) => Promise<void>;
  error: (message: string, metadata?: Record<string, unknown>) => Promise<void>;
  exception: (exception: AppException) => Promise<void>;
}

// Re-export AppException for convenience
export type { AppException } from '@repo/types';
