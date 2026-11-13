/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  // 개발 중에는 /api 요청을 실제 서버로 프록시해 CORS 없이 붙는다 (SSE 포함).
  const target = env.API_PROXY_TARGET;
  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      proxy: target
        ? {
            '/api': {
              target,
              changeOrigin: true,
              secure: true,
              // SSE가 버퍼링되지 않도록 압축 요청 헤더 제거
              headers: { 'Accept-Encoding': 'identity' },
            },
          }
        : undefined,
    },
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts'],
    },
  };
});
