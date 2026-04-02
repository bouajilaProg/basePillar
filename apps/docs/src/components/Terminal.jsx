import React, { useEffect, useState, useRef } from 'react';

const LEVEL_COLORS = {
  error: '#ef4444',
  warn: '#f59e0b',
  info: '#3b82f6',
  debug: '#6b7280',
  verbose: '#9ca3af',
};

function formatTimestamp(ts) {
  const date = new Date(ts);
  return date.toLocaleTimeString('en-US', { hour12: false });
}

function LogLine({ log }) {
  const color = LEVEL_COLORS[log.level] || '#9ca3af';
  return (
    <div style={{ fontFamily: 'monospace', fontSize: '13px', lineHeight: '1.5', padding: '2px 0' }}>
      <span style={{ color: '#6b7280' }}>[{formatTimestamp(log.timestamp)}]</span>{' '}
      <span style={{ color, fontWeight: 'bold' }}>{log.level.toUpperCase().padEnd(5)}</span>{' '}
      <span style={{ color: '#a78bfa' }}>[{log.service || 'unknown'}]</span>{' '}
      <span style={{ color: '#e5e7eb' }}>{log.message}</span>
    </div>
  );
}

export default function Terminal({
  endpoint = 'http://localhost:4000/logs/stream',
  maxLines = 200,
}) {
  const [logs, setLogs] = useState([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const containerRef = useRef(null);
  const autoScrollRef = useRef(true);

  useEffect(() => {
    let eventSource;
    let retryTimeout;

    function connect() {
      eventSource = new EventSource(endpoint);

      eventSource.onopen = () => {
        setConnected(true);
        setError(null);
      };

      eventSource.onmessage = (event) => {
        try {
          const log = JSON.parse(event.data);
          setLogs((prev) => {
            const next = [...prev, log];
            return next.length > maxLines ? next.slice(-maxLines) : next;
          });
        } catch (e) {
          console.warn('Failed to parse log:', e);
        }
      };

      eventSource.onerror = () => {
        setConnected(false);
        setError('Connection lost. Retrying...');
        eventSource.close();
        retryTimeout = setTimeout(connect, 3000);
      };
    }

    connect();

    return () => {
      eventSource?.close();
      clearTimeout(retryTimeout);
    };
  }, [endpoint, maxLines]);

  useEffect(() => {
    if (autoScrollRef.current && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  function handleScroll() {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    autoScrollRef.current = scrollHeight - scrollTop - clientHeight < 50;
  }

  function handleClear() {
    setLogs([]);
  }

  return (
    <div
      style={{
        border: '1px solid #374151',
        borderRadius: '8px',
        overflow: 'hidden',
        backgroundColor: '#1f2937',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 12px',
          backgroundColor: '#111827',
          borderBottom: '1px solid #374151',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: connected ? '#22c55e' : '#ef4444',
            }}
          />
          <span style={{ color: '#9ca3af', fontSize: '12px' }}>
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        <button
          onClick={handleClear}
          style={{
            padding: '4px 8px',
            fontSize: '12px',
            backgroundColor: '#374151',
            color: '#e5e7eb',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Clear
        </button>
      </div>

      {/* Log output */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        style={{
          height: '400px',
          overflow: 'auto',
          padding: '12px',
          backgroundColor: '#1f2937',
        }}
      >
        {error && (
          <div
            style={{
              color: '#f59e0b',
              marginBottom: '8px',
              fontFamily: 'monospace',
              fontSize: '13px',
            }}
          >
            ⚠ {error}
          </div>
        )}
        {logs.length === 0 && !error && (
          <div style={{ color: '#6b7280', fontFamily: 'monospace', fontSize: '13px' }}>
            Waiting for logs...
          </div>
        )}
        {logs.map((log, i) => (
          <LogLine key={i} log={log} />
        ))}
      </div>
    </div>
  );
}
