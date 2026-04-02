import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';

const isDev = process.env.NODE_ENV !== 'production';

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
const logsDir = path.resolve(__dirname, '../../logs');
const logsFile = path.join(logsDir, 'console.md');

// Ensure logs directory exists
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logs: StoredLog[] = [];

function formatLogToMarkdown(log: StoredLog): string {
  const metaLines = log.metadata
    ? Object.entries(log.metadata)
        .map(([k, v]) => `| ${k} | ${typeof v === 'object' ? JSON.stringify(v) : v} |`)
        .join('\n')
    : '';

  return `---

## ${log.level.toUpperCase()} - ${log.appName}

- **ID:** ${log.id}
- **Timestamp:** ${log.timestamp}
- **Received:** ${log.receivedAt}
- **Message:** ${log.message}

${metaLines ? `| Key | Value |\n|-----|-------|\n${metaLines}` : ''}
`;
}

function appendLogToFile(log: StoredLog) {
  try {
    fs.appendFileSync(logsFile, formatLogToMarkdown(log));
  } catch (err) {
    console.error('Failed to write log to file:', err);
  }
}

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
  appendLogToFile(entry);
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

async function startServer() {
  if (isDev) {
    // Development: Use Vite middleware (portless approach)
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
      root: path.resolve(__dirname, '../../src/client'),
    });
    app.use(vite.middlewares);
  } else {
    // Production: Serve static files
    const clientDist = path.resolve(__dirname, '../../dist/client');
    if (fs.existsSync(clientDist)) {
      app.use(express.static(clientDist));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(clientDist, 'index.html'));
      });
    }
  }

  app.listen(port, () => {
    console.log(`[console] ${isDev ? 'DEV' : 'PROD'} server on http://localhost:${port}`);
  });
}

startServer();
