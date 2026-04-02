import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Check
} from 'lucide-react';
import { StoredLog, LogLevel } from '../types';

interface LogRowProps {
  log: StoredLog;
  isExpanded: boolean;
  onToggle: () => void;
}

const getBadgeProps = (level: LogLevel) => {
  switch (level) {
    case 'error':
      return 'text-red-400 bg-red-400/10 border-red-400/20 shadow-glow-err';
    case 'warn':
      return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20 shadow-glow-warn';
    case 'info':
      return 'text-blue-400 bg-blue-400/10 border-blue-400/20 shadow-glow-info';
    case 'debug':
      return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    default:
      return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
  }
};

const getRowClass = (level: LogLevel) => {
  switch (level) {
    case 'error':
      return 'bg-red-950/10 hover:bg-red-950/20';
    case 'warn':
      return 'bg-yellow-950/10 hover:bg-yellow-950/20';
    default:
      return 'hover:bg-white/[0.02]';
  }
};

// Extremely simple JSON highlighter
const JsonHighlighter = ({ data }: { data: unknown }) => {
  const jsonStr = JSON.stringify(data, null, 2);
  
  // Basic regex to highlight keys, strings, numbers, booleans
  const highlighted = jsonStr.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    (match) => {
      let cls = 'text-emerald-400'; // Default string
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = 'text-blue-400'; // Key
        } else {
          cls = 'text-emerald-400'; // String
        }
      } else if (/true|false/.test(match)) {
        cls = 'text-purple-400'; // Boolean
      } else if (/null/.test(match)) {
        cls = 'text-gray-500'; // Null
      } else {
        cls = 'text-orange-400'; // Number
      }
      return `<span class="${cls}">${match}</span>`;
    }
  );

  return (
    <pre 
      className="font-mono text-[11px] leading-relaxed m-0 p-4 text-gray-300"
      dangerouslySetInnerHTML={{ __html: highlighted }}
    />
  );
};

export function LogRow({ log, isExpanded, onToggle }: LogRowProps) {
  const [copied, setCopied] = useState(false);
  const hasMeta = log.metadata && Object.keys(log.metadata).length > 0;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const data = JSON.stringify(log, null, 2);
    navigator.clipboard.writeText(data);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Extract HH:mm:ss.SSS for tight density
  const timestamp = new Date(log.receivedAt);
  const timeStr = `${timestamp.getHours().toString().padStart(2, '0')}:${timestamp.getMinutes().toString().padStart(2, '0')}:${timestamp.getSeconds().toString().padStart(2, '0')}.${timestamp.getMilliseconds().toString().padStart(3, '0')}`;

  return (
    <React.Fragment>
      <tr
        className={`group transition-colors border-b border-transparent ${getRowClass(log.level)} ${hasMeta ? 'cursor-pointer' : ''}`}
        onClick={() => hasMeta && onToggle()}
      >
        <td className="px-3 py-1.5 align-top pt-2">
          {hasMeta ? (
            isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground transition-transform" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground transition-transform" />
            )
          ) : null}
        </td>
        <td className="px-3 py-1.5 align-top pt-2 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
          {timeStr}
        </td>
        <td className="px-3 py-1.5 align-top pt-2 font-mono text-[11px] text-gray-300">
          <span className="bg-white/5 border border-white/10 rounded px-1.5 py-0.5 shadow-sm">
            {log.appName}
          </span>
        </td>
        <td className="px-3 py-1.5 align-top pt-2">
          <span className={`inline-flex px-1.5 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${getBadgeProps(log.level)}`}>
            {log.level}
          </span>
        </td>
        <td className="px-3 py-1.5 align-top pt-2 font-mono text-[11px] text-gray-200 break-all">
          {log.message}
        </td>
        <td className="px-3 py-1.5 align-top pt-1.5 text-right opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleCopy}
            className="inline-flex items-center justify-center h-6 w-6 rounded bg-white/5 border border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
            title="Copy log entry"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </td>
      </tr>
      {isExpanded && hasMeta && (
        <tr className="bg-[#050505] shadow-[inset_0_4px_6px_-4px_rgba(0,0,0,0.5)] border-b border-border">
          <td colSpan={6} className="px-8 py-4">
            <div className="rounded border border-white/5 bg-[#0a0a0a] overflow-x-auto shadow-sm">
              <div className="px-4 py-1.5 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Metadata</span>
              </div>
              <JsonHighlighter data={log.metadata} />
            </div>
          </td>
        </tr>
      )}
    </React.Fragment>
  );
}
