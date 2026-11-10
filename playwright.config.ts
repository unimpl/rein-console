import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  testIgnore: 'hub-console.spec.ts',
  fullyParallel: false,
  use: {
    baseURL: 'http://127.0.0.1:5175',
    viewport: { width: 1600, height: 900 },
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'VITE_REIN_MODE=demo npm run dev -- --host 127.0.0.1 --port 5175 --strictPort',
    url: 'http://127.0.0.1:5175',
    reuseExistingServer: false,
  },
})
