import { useEffect, useState } from 'react';
import { Pause, Filter, Settings2, Activity } from 'lucide-react';
import { LogRow } from './components/LogRow';
import { StoredLog, LogLevel } from './types';

const POLL_INTERVAL = Number(import.meta.env.VITE_POLL_INTERVAL || 3000);

export default function App() {
  const [logs, setLogs] = useState<StoredLog[]>([]);
  const [isPolling, setIsPolling] = useState(true);
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

  const uniqueApps = [...new Set(logs.map((l) => l.appName))];

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background text-foreground selection:bg-primary/30">
      <header className="flex-none flex items-center justify-between px-6 py-3 border-b border-border bg-background/80 backdrop-blur-md z-20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-primary/20 flex items-center justify-center border border-primary/30">
              <Activity className="w-4 h-4 text-blue-400" />
            </div>
            <h1 className="text-sm font-semibold tracking-tight">BasePillar Console</h1>
          </div>
          <div className="h-4 w-px bg-border"></div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Filter className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
              <select
                value={filterApp}
                onChange={(e) => setFilterApp(e.target.value)}
                className="bg-panel border border-border rounded shadow-sm pl-8 pr-8 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 appearance-none hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <option value="" className="bg-[#0f0f11] text-gray-200">
                  All Services
                </option>
                {uniqueApps.map((app) => (
                  <option key={app} value={app} className="bg-[#0f0f11] text-gray-200">
                    {app}
                  </option>
                ))}
              </select>
            </div>
            <div className="relative">
              <Settings2 className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value as LogLevel | '')}
                className="bg-panel border border-border rounded shadow-sm pl-8 pr-8 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 appearance-none hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <option value="" className="bg-[#0f0f11] text-gray-200">
                  All Levels
                </option>
                <option value="debug" className="bg-[#0f0f11] text-gray-200">
                  Debug
                </option>
                <option value="info" className="bg-[#0f0f11] text-gray-200">
                  Info
                </option>
                <option value="warn" className="bg-[#0f0f11] text-gray-200">
                  Warn
                </option>
                <option value="error" className="bg-[#0f0f11] text-gray-200">
                  Error
                </option>
              </select>
            </div>
            {(filterApp || filterLevel) && (
              <button
                onClick={() => {
                  setFilterApp('');
                  setFilterLevel('');
                }}
                className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsPolling(!isPolling)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded border shadow-sm text-xs font-medium transition-all ${
              isPolling
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-panel border-border text-muted-foreground hover:bg-muted'
            }`}
          >
            {isPolling ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Live Status
              </>
            ) : (
              <>
                <Pause className="w-3 h-3" />
                Paused
              </>
            )}
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-auto relative">
        <table className="w-full text-left border-collapse table-fixed">
          <thead className="bg-background/95 backdrop-blur-sm text-muted-foreground text-[11px] uppercase tracking-wider sticky top-0 z-10 border-b border-border shadow-sm">
            <tr>
              <th className="px-3 py-2 font-medium w-8"></th>
              <th className="px-3 py-2 font-medium w-[100px]">Timestamp</th>
              <th className="px-3 py-2 font-medium w-[140px]">Service</th>
              <th className="px-3 py-2 font-medium w-[80px]">Level</th>
              <th className="px-3 py-2 font-medium">Message</th>
              <th className="px-3 py-2 font-medium w-[60px]"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50 text-[13px]">
            {logs.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-12 text-center text-muted-foreground font-mono text-xs"
                >
                  No logs found matching criteria.
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
      </main>
    </div>
  );
}
