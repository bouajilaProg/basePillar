import { useEffect, useState } from 'react';
import { RefreshCcw, Filter } from 'lucide-react';
import { LogRow } from './components/LogRow';
import { StoredLog, LogLevel } from './types';

const POLL_INTERVAL = Number(import.meta.env.VITE_POLL_INTERVAL || 3000);

export default function App() {
  const [logs, setLogs] = useState<StoredLog[]>([]);
  const [isPolling, setIsPolling] = useState(true);
  const [lastFetched, setLastFetched] = useState<Date>(new Date());
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Filters
  const [filterApp, setFilterApp] = useState<string>('');
  const [filterLevel, setFilterLevel] = useState<LogLevel | ''>('');

  const fetchLogs = async () => {
    try {
      const params = new URLSearchParams({ limit: '500' });
      if (filterApp) params.set('appName', filterApp);
      if (filterLevel) params.set('level', filterLevel);

      const res = await fetch(`/logs?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setLastFetched(new Date());
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    }
  };

  useEffect(() => {
    fetchLogs();
    if (!isPolling) return;

    const interval = setInterval(fetchLogs, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [isPolling, filterApp, filterLevel]);

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  // Get unique app names for filter dropdown
  const uniqueApps = [...new Set(logs.map((l) => l.appName))];

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <header className="flex-none flex items-center justify-between p-4 border-b border-border bg-card shadow-sm z-10">
        <div>
          <h1 className="text-lg font-bold tracking-tight flex items-center gap-2">
            BasePillar Console
            <span className="bg-primary/20 text-blue-300 text-xs px-2 py-0.5 rounded-full border border-primary/30">
              v1.0
            </span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            POST logs to <code className="bg-muted px-1 rounded">/logs</code>
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-xs text-muted-foreground">
            Last update: {lastFetched.toLocaleTimeString()}
          </div>
          <button
            onClick={() => setIsPolling(!isPolling)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${isPolling ? 'bg-primary text-white hover:bg-primary-hover' : 'bg-muted text-foreground hover:bg-muted/80'}`}
          >
            <RefreshCcw className={`w-4 h-4 ${isPolling ? 'animate-spin' : ''}`} />
            {isPolling ? 'Polling' : 'Paused'}
          </button>
        </div>
      </header>

      {/* Filters */}
      <div className="flex-none flex items-center gap-4 p-4 border-b border-border bg-card/50">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <select
          value={filterApp}
          onChange={(e) => setFilterApp(e.target.value)}
          className="bg-muted border border-border rounded-md px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">All Apps</option>
          {uniqueApps.map((app) => (
            <option key={app} value={app}>
              {app}
            </option>
          ))}
        </select>
        <select
          value={filterLevel}
          onChange={(e) => setFilterLevel(e.target.value as LogLevel | '')}
          className="bg-muted border border-border rounded-md px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">All Levels</option>
          <option value="debug">Debug</option>
          <option value="info">Info</option>
          <option value="warn">Warn</option>
          <option value="error">Error</option>
        </select>
        {(filterApp || filterLevel) && (
          <button
            onClick={() => {
              setFilterApp('');
              setFilterLevel('');
            }}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Clear filters
          </button>
        )}
      </div>

      <main className="flex-1 overflow-auto p-4">
        <div className="rounded-md border border-border bg-card overflow-hidden">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-muted text-muted-foreground text-xs uppercase tracking-wider sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-4 py-3 font-medium w-8"></th>
                <th className="px-4 py-3 font-medium">Received</th>
                <th className="px-4 py-3 font-medium">App</th>
                <th className="px-4 py-3 font-medium">Level</th>
                <th className="px-4 py-3 font-medium">Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No logs received yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <LogRow
                    key={log.id}
                    log={log}
                    isExpanded={expandedRows.has(log.id)}
                    onToggle={() => toggleRow(log.id)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
