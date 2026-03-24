import type { AppException } from '@repo/types';
import type { Logger, LoggerConfig, LogLevel } from '../types';
import { getDefaultFetch, shouldLog, logToConsole, shipToRemote } from './log-service';

/**
 * Creates a logger instance for an application
 *
 * Features:
 * - Local console output with color coding
 * - Remote log shipping to centralized monitoring service
 * - Exception integration with @repo/types AppException
 * - Configurable minimum log level
 *
 * @example
 * ```typescript
 * const logger = createLogger({
 *   appName: 'api',
 *   color: '#e84e31',
 *   consoleUrl: process.env.CENTRALIZED_CONSOLE_URL,
 * });
 *
 * logger.info('Server started', { port: 3000 });
 * logger.error('Database connection failed', { host: 'localhost' });
 *
 * // Log an exception
 * try {
 *   await riskyOperation();
 * } catch (e) {
 *   if (e instanceof AppException) {
 *     logger.exception(e);
 *   }
 * }
 * ```
 */
export const createLogger = (config: LoggerConfig): Logger => {
  const {
    appName,
    color = '#3b82f6',
    consoleUrl,
    minLevel = 'debug',
    fetchFn = getDefaultFetch(),
  } = config;

  /**
   * Core logging function
   */
  const log = async (
    level: LogLevel,
    message: string,
    metadata?: Record<string, unknown>
  ): Promise<void> => {
    if (!shouldLog(level, minLevel)) {
      return;
    }

    // Always log to console
    logToConsole(appName, color, level, message, metadata);

    // Ship to remote if configured
    await shipToRemote(consoleUrl, fetchFn, appName, level, message, metadata);
  };

  return {
    debug: (message: string, metadata?: Record<string, unknown>) => log('debug', message, metadata),
    info: (message: string, metadata?: Record<string, unknown>) => log('info', message, metadata),
    warn: (message: string, metadata?: Record<string, unknown>) => log('warn', message, metadata),
    error: (message: string, metadata?: Record<string, unknown>) => log('error', message, metadata),

    /**
     * Log an AppException with full context
     * Extracts structured data from the exception for rich logging
     */
    exception: async (exception: AppException): Promise<void> => {
      const payload = exception.toLogPayload();
      await log('error', exception.message, payload as Record<string, unknown>);
    },
  };
};
