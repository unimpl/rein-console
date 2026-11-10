import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests',
  testMatch: 'hub-console.spec.ts',
  workers: 1,
  timeout: 60000,
  expect: { timeout: 20000 },
  use: {
    baseURL: 'http://127.0.0.1:5174',
    viewport: { width: 1600, height: 900 },
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined },
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command:
        'REIN_TEST_HTTP_PORT=19010 REIN_TEST_GRPC_PORT=19011 REIN_TEST_A2A_PORT=19012 python3 ../reinsman/rein/tests/hub_stack.py --serve',
      url: 'http://127.0.0.1:19010/api/health',
      reuseExistingServer: false,
      gracefulShutdown: { signal: 'SIGTERM', timeout: 20000 },
      timeout: 45000,
    },
    {
      command:
        'VITE_REIN_MODE=hub REIN_HUB_HTTP=http://127.0.0.1:19010 npm run dev -- --host 127.0.0.1 --port 5174 --strictPort',
      url: 'http://127.0.0.1:5174',
      reuseExistingServer: false,
    },
  ],
})
