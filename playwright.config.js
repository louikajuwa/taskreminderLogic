import { defineConfig, devices } from '@playwright/test';

const vp = (name, width, height) => ({
    name,
    use: { ...devices['Desktop Chrome'], viewport: { width, height }, isMobile: false, hasTouch: false },
});

export default defineConfig({
    testDir: 'tests/e2e',
    globalSetup: './tests/e2e/global-setup.js',
    workers: 1,
    retries: 0,
    fullyParallel: false,
    timeout: 60_000,
    expect: { timeout: 10_000 },
    reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
    use: {
        baseURL: process.env.E2E_BASE_URL || 'http://localhost:8090',
        storageState: 'tests/e2e/.auth/user.json',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
    },
    projects: [
        vp('mobile-375', 375, 812),
        vp('mobile-390', 390, 844),
        vp('tablet-768', 768, 1024),
        vp('desktop-1366', 1366, 768),
        vp('desktop-1920', 1920, 1080),
    ],
});
