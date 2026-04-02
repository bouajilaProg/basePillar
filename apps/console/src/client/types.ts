export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface StoredLog {
  id: string;
  appName: string;
  message: string;
  level: LogLevel;
  timestamp: string;
  metadata?: Record<string, unknown>;
  receivedAt: string;
}
