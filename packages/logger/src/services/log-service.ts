import type { LogLevel, LogPayload } from '../types';

/**
 * Log level priority for filtering
 */
export const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Check if the global fetch is available
 * This handles both browser and Node.js 18+ environments
 */
export const getDefaultFetch = (): typeof fetch | undefined => {
  if (typeof globalThis !== 'undefined' && typeof globalThis.fetch === 'function') {
    return globalThis.fetch.bind(globalThis);
  }
  return undefined;
};

/**
 * Check if a log level should be output based on minimum level
 */
export const shouldLog = (level: LogLevel, minLevel: LogLevel): boolean => {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[minLevel];
};

/**
 * Format and output to local console
 * Uses CSS styling in browser environments, falls back to plain text in Node
 */
export const logToConsole = (
  appName: string,
  color: string,
  level: LogLevel,
  message: string,
  metadata?: Record<string, unknown>
): void => {
  const timestamp = new Date().toISOString();
  const prefix = `[${appName}] [${level.toUpperCase()}]`;

  // Check if we're in a browser environment (has CSS console support)
  const isBrowser = typeof globalThis !== 'undefined' && 'window' in globalThis;

  if (isBrowser) {
    // Browser: use CSS styling
    console.log(
      `%c${prefix} %c${message}`,
      `color: ${color}; font-weight: bold;`,
      'color: inherit;',
      metadata || ''
    );
  } else {
    // Node.js: plain text with timestamp
    const consoleMethod =
      level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    consoleMethod(`${timestamp} ${prefix} ${message}`, metadata ? JSON.stringify(metadata) : '');
  }
};

/**
 * Ship logs to centralized monitoring service
 * Fire-and-forget: we don't want logging failures to affect the application
 */
export const shipToRemote = async (
  consoleUrl: string | undefined,
  fetchFn: typeof fetch | undefined,
  appName: string,
  level: LogLevel,
  message: string,
  metadata?: Record<string, unknown>
): Promise<void> => {
  if (!consoleUrl || !fetchFn) {
    return;
  }

  const payload: LogPayload = {
    appName,
    message,
    level,
    timestamp: new Date().toISOString(),
    metadata,
  };

  try {
    await fetchFn(`${consoleUrl}/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    // Don't let logging failures crash the app
    // Use console.error as a fallback - this is intentional
    console.error('[Logger] Failed to ship logs to centralized console:', err);
  }
};
