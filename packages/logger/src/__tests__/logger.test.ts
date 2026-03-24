import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createLogger, type LogLevel, type LogPayload } from '../index';
import { AppException } from '@repo/types';

/**
 * AGGRESSIVE TEST SUITE: Logger
 *
 * Why test the logger so thoroughly?
 * 1. Logging is critical infrastructure - if it fails, debugging production issues becomes impossible
 * 2. Remote log shipping is fire-and-forget - must verify it doesn't crash the app
 * 3. Log level filtering affects observability - wrong filtering = missed alerts
 * 4. Console output formatting affects developer experience
 * 5. Exception integration must work with our custom exception hierarchy
 *
 * Testing strategy:
 * - Mock fetch for remote shipping tests
 * - Mock console for output verification
 * - Test all log levels and filtering combinations
 * - Verify exception integration preserves all context
 */

// Test exception implementation
class TestException extends AppException {
  readonly code = 'TEST_ERROR';
  readonly statusCode = 500;
  constructor(message: string, metadata?: Record<string, unknown>) {
    super(message, metadata);
  }
}

describe('createLogger', () => {
  let consoleSpy: { log: ReturnType<typeof vi.spyOn>; warn: ReturnType<typeof vi.spyOn>; error: ReturnType<typeof vi.spyOn> };
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Spy on console methods
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    };
    // Mock fetch
    mockFetch = vi.fn().mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('basic logging', () => {
    /**
     * WHY: Each log level should work independently
     * This verifies the basic contract of the logger
     */
    it('should log debug messages', async () => {
      const logger = createLogger({ appName: 'test' });
      await logger.debug('Debug message');

      expect(consoleSpy.log).toHaveBeenCalled();
      const logOutput = consoleSpy.log.mock.calls[0].join(' ');
      expect(logOutput).toContain('DEBUG');
      expect(logOutput).toContain('Debug message');
    });

    it('should log info messages', async () => {
      const logger = createLogger({ appName: 'test' });
      await logger.info('Info message');

      expect(consoleSpy.log).toHaveBeenCalled();
      const logOutput = consoleSpy.log.mock.calls[0].join(' ');
      expect(logOutput).toContain('INFO');
      expect(logOutput).toContain('Info message');
    });

    it('should log warn messages using console.warn', async () => {
      const logger = createLogger({ appName: 'test' });
      await logger.warn('Warning message');

      expect(consoleSpy.warn).toHaveBeenCalled();
      const logOutput = consoleSpy.warn.mock.calls[0].join(' ');
      expect(logOutput).toContain('WARN');
    });

    it('should log error messages using console.error', async () => {
      const logger = createLogger({ appName: 'test' });
      await logger.error('Error message');

      expect(consoleSpy.error).toHaveBeenCalled();
      const logOutput = consoleSpy.error.mock.calls[0].join(' ');
      expect(logOutput).toContain('ERROR');
    });

    /**
     * WHY: App name in logs helps filter/search in log aggregation
     * Critical for multi-app deployments
     */
    it('should include app name in log output', async () => {
      const logger = createLogger({ appName: 'my-api' });
      await logger.info('Test');

      const logOutput = consoleSpy.log.mock.calls[0].join(' ');
      expect(logOutput).toContain('my-api');
    });

    /**
     * WHY: Timestamps are essential for log correlation and debugging
     * Must be present in every log entry
     */
    it('should include ISO timestamp in log output', async () => {
      const logger = createLogger({ appName: 'test' });
      const before = new Date();
      await logger.info('Test');
      const after = new Date();

      const logOutput = consoleSpy.log.mock.calls[0].join(' ');
      // Should contain an ISO-like timestamp pattern
      expect(logOutput).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('metadata handling', () => {
    /**
     * WHY: Metadata provides context for debugging
     * Must be included in log output
     */
    it('should include metadata in log output', async () => {
      const logger = createLogger({ appName: 'test' });
      await logger.info('User created', { userId: '123', email: 'test@example.com' });

      const logOutput = consoleSpy.log.mock.calls[0].join(' ');
      expect(logOutput).toContain('userId');
      expect(logOutput).toContain('123');
    });

    /**
     * WHY: Undefined metadata should not cause errors
     * Common case when no additional context is needed
     */
    it('should handle missing metadata gracefully', async () => {
      const logger = createLogger({ appName: 'test' });

      // Should not throw
      await expect(logger.info('Simple message')).resolves.not.toThrow();
    });

    /**
     * WHY: Complex nested objects are common (request body, user data)
     * Must be serialized correctly
     */
    it('should handle nested metadata objects', async () => {
      const logger = createLogger({ appName: 'test' });
      await logger.info('Complex data', {
        user: { id: 1, roles: ['admin', 'user'] },
        request: { path: '/api/test', method: 'POST' },
      });

      const logOutput = consoleSpy.log.mock.calls[0].join(' ');
      expect(logOutput).toContain('admin');
    });

    /**
     * WHY: Empty object is valid metadata
     * Should not cause issues
     */
    it('should handle empty metadata object', async () => {
      const logger = createLogger({ appName: 'test' });
      await expect(logger.info('Empty metadata', {})).resolves.not.toThrow();
    });
  });

  describe('log level filtering', () => {
    /**
     * WHY: In production, we often set minLevel to 'info' to reduce noise
     * Debug logs should be filtered out
     */
    it('should filter out debug logs when minLevel is info', async () => {
      const logger = createLogger({ appName: 'test', minLevel: 'info' });

      await logger.debug('Should not appear');
      await logger.info('Should appear');

      expect(consoleSpy.log).toHaveBeenCalledTimes(1);
      const logOutput = consoleSpy.log.mock.calls[0].join(' ');
      expect(logOutput).toContain('INFO');
      expect(logOutput).not.toContain('DEBUG');
    });

    /**
     * WHY: Error-only mode for critical alerting systems
     * Only errors should pass through
     */
    it('should only log errors when minLevel is error', async () => {
      const logger = createLogger({ appName: 'test', minLevel: 'error' });

      await logger.debug('No');
      await logger.info('No');
      await logger.warn('No');
      await logger.error('Yes');

      expect(consoleSpy.log).not.toHaveBeenCalled();
      expect(consoleSpy.warn).not.toHaveBeenCalled();
      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
    });

    /**
     * WHY: Warn level should include warn and error, not info/debug
     */
    it('should respect warn level filtering', async () => {
      const logger = createLogger({ appName: 'test', minLevel: 'warn' });

      await logger.debug('No');
      await logger.info('No');
      await logger.warn('Yes');
      await logger.error('Yes');

      expect(consoleSpy.log).not.toHaveBeenCalled();
      expect(consoleSpy.warn).toHaveBeenCalled();
      expect(consoleSpy.error).toHaveBeenCalled();
    });

    /**
     * WHY: Default should be debug (show everything)
     * Development needs all logs
     */
    it('should default to debug level (show all)', async () => {
      const logger = createLogger({ appName: 'test' });

      await logger.debug('Yes');
      await logger.info('Yes');
      await logger.warn('Yes');
      await logger.error('Yes');

      expect(consoleSpy.log).toHaveBeenCalledTimes(2); // debug + info
      expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
    });
  });

  describe('remote log shipping', () => {
    /**
     * WHY: When consoleUrl is configured, logs should be sent remotely
     * This is the primary use case for centralized logging
     */
    it('should ship logs to remote when consoleUrl is configured', async () => {
      const logger = createLogger({
        appName: 'test',
        consoleUrl: 'http://localhost:4000',
        fetchFn: mockFetch,
      });

      await logger.info('Remote log', { userId: '123' });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4000/logs',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );

      // Verify payload structure
      const callArg = mockFetch.mock.calls[0][1];
      const payload = JSON.parse(callArg.body) as LogPayload;
      expect(payload.appName).toBe('test');
      expect(payload.message).toBe('Remote log');
      expect(payload.level).toBe('info');
      expect(payload.metadata).toEqual({ userId: '123' });
      expect(payload.timestamp).toMatch(/\d{4}-\d{2}-\d{2}T/);
    });

    /**
     * WHY: Without consoleUrl, remote shipping should be skipped
     * No fetch calls, no errors
     */
    it('should not ship remotely when consoleUrl is not configured', async () => {
      const logger = createLogger({ appName: 'test', fetchFn: mockFetch });

      await logger.info('Local only');

      expect(mockFetch).not.toHaveBeenCalled();
    });

    /**
     * WHY: Logging failures must not crash the application
     * Fire-and-forget semantics are critical
     */
    it('should handle remote shipping failures gracefully', async () => {
      const failingFetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const logger = createLogger({
        appName: 'test',
        consoleUrl: 'http://localhost:4000',
        fetchFn: failingFetch,
      });

      // Should not throw
      await expect(logger.info('Test')).resolves.not.toThrow();

      // Should log failure to console.error
      expect(consoleSpy.error).toHaveBeenCalledWith(
        '[Logger] Failed to ship logs to centralized console:',
        expect.any(Error)
      );
    });

    /**
     * WHY: All log levels should ship to remote
     * Not just errors
     */
    it('should ship all log levels to remote', async () => {
      const logger = createLogger({
        appName: 'test',
        consoleUrl: 'http://localhost:4000',
        fetchFn: mockFetch,
      });

      await logger.debug('Debug');
      await logger.info('Info');
      await logger.warn('Warn');
      await logger.error('Error');

      expect(mockFetch).toHaveBeenCalledTimes(4);

      const levels = mockFetch.mock.calls.map((call: unknown[]) => {
        const payload = JSON.parse((call[1] as { body: string }).body);
        return payload.level;
      });

      expect(levels).toEqual(['debug', 'info', 'warn', 'error']);
    });

    /**
     * WHY: Filtered logs should not be shipped
     * Saves bandwidth and storage
     */
    it('should not ship filtered logs to remote', async () => {
      const logger = createLogger({
        appName: 'test',
        consoleUrl: 'http://localhost:4000',
        minLevel: 'error',
        fetchFn: mockFetch,
      });

      await logger.debug('No');
      await logger.info('No');
      await logger.warn('No');
      await logger.error('Yes');

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('exception logging', () => {
    /**
     * WHY: AppException integration is a key feature
     * Must extract structured data correctly
     */
    it('should log exceptions with full context', async () => {
      const logger = createLogger({
        appName: 'test',
        consoleUrl: 'http://localhost:4000',
        fetchFn: mockFetch,
      });

      const exception = new TestException('Something broke', { userId: '123' });
      await logger.exception(exception);

      expect(consoleSpy.error).toHaveBeenCalled();

      // Verify remote payload includes exception details
      const callArg = mockFetch.mock.calls[0][1];
      const payload = JSON.parse(callArg.body) as LogPayload;

      expect(payload.level).toBe('error');
      expect(payload.message).toBe('Something broke');
      expect(payload.metadata).toHaveProperty('code', 'TEST_ERROR');
      expect(payload.metadata).toHaveProperty('statusCode', 500);
    });

    /**
     * WHY: Exception's toLogPayload should be used
     * Includes stack trace and all context
     */
    it('should include exception stack trace in metadata', async () => {
      const logger = createLogger({
        appName: 'test',
        consoleUrl: 'http://localhost:4000',
        fetchFn: mockFetch,
      });

      const exception = new TestException('Error with stack');
      await logger.exception(exception);

      const callArg = mockFetch.mock.calls[0][1];
      const payload = JSON.parse(callArg.body) as LogPayload;

      expect(payload.metadata).toHaveProperty('stack');
      expect(typeof payload.metadata?.stack).toBe('string');
    });
  });

  describe('edge cases', () => {
    /**
     * WHY: Empty app name is technically valid but problematic
     * Should work but log a warning
     */
    it('should handle empty app name', async () => {
      const logger = createLogger({ appName: '' });
      await expect(logger.info('Test')).resolves.not.toThrow();
    });

    /**
     * WHY: Unicode in messages and metadata
     * Must be preserved correctly in JSON
     */
    it('should handle unicode characters', async () => {
      const logger = createLogger({
        appName: 'テスト',
        consoleUrl: 'http://localhost:4000',
        fetchFn: mockFetch,
      });

      await logger.info('こんにちは 🎉', { greeting: '你好' });

      const callArg = mockFetch.mock.calls[0][1];
      const payload = JSON.parse(callArg.body) as LogPayload;

      expect(payload.appName).toBe('テスト');
      expect(payload.message).toBe('こんにちは 🎉');
      expect(payload.metadata?.greeting).toBe('你好');
    });

    /**
     * WHY: Very long messages should not crash
     * Truncation is the logging service's responsibility
     */
    it('should handle very long messages', async () => {
      const logger = createLogger({
        appName: 'test',
        consoleUrl: 'http://localhost:4000',
        fetchFn: mockFetch,
      });

      const longMessage = 'x'.repeat(100000);
      await expect(logger.info(longMessage)).resolves.not.toThrow();

      const callArg = mockFetch.mock.calls[0][1];
      const payload = JSON.parse(callArg.body) as LogPayload;
      expect(payload.message.length).toBe(100000);
    });

    /**
     * WHY: Concurrent logging should not cause race conditions
     */
    it('should handle concurrent log calls', async () => {
      const logger = createLogger({
        appName: 'test',
        consoleUrl: 'http://localhost:4000',
        fetchFn: mockFetch,
      });

      await Promise.all([
        logger.info('Log 1'),
        logger.info('Log 2'),
        logger.info('Log 3'),
        logger.warn('Log 4'),
        logger.error('Log 5'),
      ]);

      expect(mockFetch).toHaveBeenCalledTimes(5);
    });

    /**
     * WHY: Special characters in URLs shouldn't break remote shipping
     */
    it('should handle special characters in consoleUrl', async () => {
      const logger = createLogger({
        appName: 'test',
        consoleUrl: 'http://localhost:4000/api/v1',
        fetchFn: mockFetch,
      });

      await logger.info('Test');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4000/api/v1/logs',
        expect.anything()
      );
    });
  });
});
