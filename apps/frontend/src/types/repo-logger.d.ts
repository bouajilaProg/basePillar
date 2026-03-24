declare module '@repo/logger' {
  export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

  export interface LoggerConfig {
    appName: string;
    color?: string;
    consoleUrl?: string;
    minLevel?: LogLevel;
    fetchFn?: typeof fetch;
  }

  export interface Logger {
    debug: (message: string, metadata?: Record<string, unknown>) => Promise<void>;
    info: (message: string, metadata?: Record<string, unknown>) => Promise<void>;
    warn: (message: string, metadata?: Record<string, unknown>) => Promise<void>;
    error: (message: string, metadata?: Record<string, unknown>) => Promise<void>;
    exception: (exception: {
      toLogPayload: () => Record<string, unknown>;
      message: string;
    }) => Promise<void>;
  }

  export const createLogger: (config: LoggerConfig) => Logger;
}
