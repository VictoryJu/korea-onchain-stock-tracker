import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fetchNaverTopTurnoverQuotes } from './src/services/koreanEquities';

let domesticCache:
  | {
      expiresAt: number;
      body: string;
    }
  | undefined;

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'domestic-top-turnover-api',
      configureServer(server) {
        server.middlewares.use('/api/domestic/top-turnover', async (_request, response) => {
          response.setHeader('Content-Type', 'application/json; charset=utf-8');

          try {
            if (domesticCache && domesticCache.expiresAt > Date.now()) {
              response.end(domesticCache.body);
              return;
            }

            const body = JSON.stringify(await fetchNaverTopTurnoverQuotes());
            domesticCache = {
              body,
              expiresAt: Date.now() + 30_000,
            };
            response.end(body);
          } catch (error) {
            response.statusCode = 502;
            response.end(
              JSON.stringify({
                error: error instanceof Error ? error.message : String(error),
              }),
            );
          }
        });
      },
    },
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
});
