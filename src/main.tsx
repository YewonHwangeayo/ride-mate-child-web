import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './style.css';

const client = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 0, refetchOnWindowFocus: true },
  },
});

async function boot() {
  // 개발 전용 데모 모드 (배포 빌드에서는 이 블록이 제거된다)
  if (import.meta.env.DEV) {
    const { maybeInstallDemo } = await import('./dev/mockServer');
    maybeInstallDemo();
  }
  createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <QueryClientProvider client={client}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </React.StrictMode>,
  );
}
void boot();
