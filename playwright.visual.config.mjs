import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: 'visual-regression.spec.mjs',
  reporter: 'line',
  fullyParallel: false,
  workers: 1,
  use: {
    headless: true,
  },
  snapshotPathTemplate: '{testDir}/visual-baselines/{arg}{ext}',
});
