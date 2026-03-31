import express from 'express';
import cors from 'cors';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface IncomingLog {
  appName: string;
  message: string;
  level: LogLevel;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

interface StoredLog extends IncomingLog {
  id: string;
  receivedAt: string;
}

const app = express();
const port = Number(process.env.PORT || 4000);
const maxLogs = Number(process.env.MAX_LOGS || 1000);

const logs: StoredLog[] = [];

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'console', port, logs: logs.length });
});

app.post('/logs', (req, res) => {
  const body = req.body as Partial<IncomingLog>;

  if (!body || !body.appName || !body.message || !body.level || !body.timestamp) {
    return res.status(400).json({
      error: 'Invalid log payload',
      required: ['appName', 'message', 'level', 'timestamp'],
    });
  }

  const entry: StoredLog = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    appName: body.appName,
    message: body.message,
    level: body.level,
    timestamp: body.timestamp,
    metadata: body.metadata,
    receivedAt: new Date().toISOString(),
  };

  logs.unshift(entry);
  if (logs.length > maxLogs) {
    logs.splice(maxLogs);
  }

  return res.status(202).json({ accepted: true });
});

app.get('/logs', (req, res) => {
  const limit = Number(req.query.limit || 200);
  const appName = typeof req.query.appName === 'string' ? req.query.appName : undefined;
  const level = typeof req.query.level === 'string' ? req.query.level : undefined;

  let filtered = logs;
  if (appName) {
    filtered = filtered.filter((log) => log.appName === appName);
  }
  if (level) {
    filtered = filtered.filter((log) => log.level === level);
  }

  return res.json({
    total: filtered.length,
    logs: filtered.slice(0, Math.max(1, Math.min(limit, 1000))),
  });
});

app.get('/', (_req, res) => {
  const rows = logs
    .slice(0, 200)
    .map((log) => {
      const meta = log.metadata ? JSON.stringify(log.metadata) : '';
      return `<tr>
        <td>${escapeHtml(log.receivedAt)}</td>
        <td>${escapeHtml(log.appName)}</td>
        <td>${escapeHtml(log.level.toUpperCase())}</td>
        <td>${escapeHtml(log.message)}</td>
        <td><code>${escapeHtml(meta)}</code></td>
      </tr>`;
    })
    .join('');

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>BasePillar Log Console</title>
    <style>
      :root { color-scheme: light; }
      body { margin: 0; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; background: #0b1220; color: #e5e7eb; }
      header { padding: 16px 20px; border-bottom: 1px solid #1f2937; background: #111827; position: sticky; top: 0; }
      h1 { margin: 0; font-size: 18px; }
      .meta { color: #9ca3af; font-size: 12px; margin-top: 4px; }
      .wrap { padding: 16px 20px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { text-align: left; padding: 10px 8px; border-bottom: 1px solid #1f2937; vertical-align: top; font-size: 12px; }
      th { color: #93c5fd; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
      tr:hover td { background: #0f172a; }
      code { white-space: pre-wrap; color: #cbd5e1; }
      .empty { color: #9ca3af; margin: 16px 0; }
      .toolbar { margin: 12px 0; display: flex; gap: 8px; }
      button { background: #1d4ed8; border: 0; color: white; padding: 8px 10px; border-radius: 6px; cursor: pointer; }
      button:hover { background: #1e40af; }
      a { color: #93c5fd; }
    </style>
  </head>
  <body>
    <header>
      <h1>BasePillar Centralized Log Console</h1>
      <div class="meta">POST logs to <code>/logs</code> | API: <a href="/logs">/logs</a> | Health: <a href="/health">/health</a></div>
    </header>
    <div class="wrap">
      <div class="toolbar">
        <button onclick="location.reload()">Refresh</button>
      </div>
      ${rows ? `<table><thead><tr><th>Received</th><th>App</th><th>Level</th><th>Message</th><th>Metadata</th></tr></thead><tbody>${rows}</tbody></table>` : '<p class="empty">No logs received yet.</p>'}
    </div>
  </body>
</html>`);
});

app.listen(port, () => {
  console.log(`[console] listening on http://localhost:${port}`);
});

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
