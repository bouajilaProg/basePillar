import React from 'react';
import {
  AlertTriangle,
  Info,
  ShieldAlert,
  FileText,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { StoredLog, LogLevel } from './types';

interface LogRowProps {
  log: StoredLog;
  isExpanded: boolean;
  onToggle: () => void;
}

const getLevelIcon = (level: LogLevel) => {
  switch (level) {
    case 'error':
      return <ShieldAlert className="w-4 h-4 text-red-500" />;
    case 'warn':
      return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    case 'info':
      return <Info className="w-4 h-4 text-blue-400" />;
    case 'debug':
      return <FileText className="w-4 h-4 text-gray-400" />;
    default:
      return <Info className="w-4 h-4" />;
  }
};

const getRowClass = (level: LogLevel) => {
  switch (level) {
    case 'error':
      return 'bg-red-950/20 hover:bg-red-900/30';
    case 'warn':
      return 'bg-yellow-950/20 hover:bg-yellow-900/30';
    default:
      return 'hover:bg-accent';
  }
};

export function LogRow({ log, isExpanded, onToggle }: LogRowProps) {
  const hasMeta = log.metadata && Object.keys(log.metadata).length > 0;

  return (
    <React.Fragment>
      <tr
        className={`transition-colors ${getRowClass(log.level)} ${hasMeta ? 'cursor-pointer' : ''}`}
        onClick={() => hasMeta && onToggle()}
      >
        <td className="px-4 py-3">
          {hasMeta ? (
            isExpanded ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )
          ) : null}
        </td>
        <td className="px-4 py-3 font-mono text-xs whitespace-nowrap text-muted-foreground">
          {new Date(log.receivedAt).toISOString().split('T')[1].slice(0, -1)}
        </td>
        <td className="px-4 py-3 font-medium text-foreground">{log.appName}</td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5">
            {getLevelIcon(log.level)}
            <span className="uppercase text-xs font-semibold tracking-wide">{log.level}</span>
          </div>
        </td>
        <td className="px-4 py-3 truncate max-w-[400px]" title={log.message}>
          {log.message}
        </td>
      </tr>
      {isExpanded && hasMeta && (
        <tr className="bg-black/20">
          <td colSpan={5} className="px-12 py-3">
            <div className="rounded-md bg-background p-3 overflow-x-auto">
              <table className="w-full text-xs">
                <tbody>
                  {Object.entries(log.metadata as Record<string, unknown>).map(([key, value]) => (
                    <tr key={key} className="border-b border-border/30 last:border-0">
                      <td className="py-1.5 px-2 font-semibold text-muted-foreground w-1/4 align-top">
                        {key}
                      </td>
                      <td className="py-1.5 px-2 font-mono text-foreground break-all">
                        {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </React.Fragment>
  );
}
