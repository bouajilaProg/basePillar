import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createLogger } from '@repo/logger';
import '@repo/ui/globals.css';

import { RootLayout } from './routes/layout';
import { HomePage } from './routes/index';
import { LoginPage } from './routes/auth/login';
import { RegisterPage } from './routes/auth/register';
import { DashboardPage } from './routes/dashboard/index';
import { DashboardLayout } from './routes/dashboard/layout';
import { NotFoundPage } from './routes/not-found';
import { DebugErrorPage } from './routes/debug/error';

const logger = createLogger({
  appName: 'frontend',
  color: '#61dafb',
  consoleUrl: import.meta.env.VITE_CENTRALIZED_CONSOLE_URL,
});

logger.info('Frontend initialized');

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<RootLayout />}>
            <Route index element={<HomePage />} />
            <Route path="auth">
              <Route path="login" element={<LoginPage />} />
              <Route path="register" element={<RegisterPage />} />
            </Route>
            <Route path="dashboard" element={<DashboardLayout />}>
              <Route index element={<DashboardPage />} />
            </Route>
            <Route path="debug">
              <Route path="error" element={<DebugErrorPage />} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
