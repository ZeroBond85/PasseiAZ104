import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  use: {
    baseURL: 'http://127.0.0.1:4173/PasseiAZ104/',
  },
  webServer: {
    command: 'npm run preview -- --port 4173 --strictPort --host 127.0.0.1',
    port: 4173,
    reuseExistingServer: false,
  },
})
