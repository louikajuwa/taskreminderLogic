import { test, expect } from '@playwright/test';
import fs from 'node:fs';

// Fresh context: no storageState.
test.use({ storageState: { cookies: [], origins: [] } });

test('login page renders', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
});

test('guest is redirected from /dashboard to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
});

// Login attempts are throttled (5/email), so the attempt-making tests run on one project only.
test.describe('login attempts (desktop only, 2 attempts total)', () => {
    test.beforeEach(({}, ti) => {
        test.skip(ti.project.name !== 'desktop-1366', 'throttle budget');
    });

    test('invalid login shows error', async ({ page }) => {
        await page.goto('/login');
        await page.fill('#email', 'nobody-' + Date.now() + '@example.com');
        await page.fill('#password', 'wrong-password');
        await page.getByRole('button', { name: 'Sign in' }).click();
        await expect(page.getByText(/these credentials do not match/i).first()).toBeVisible();
        await expect(page).toHaveURL(/\/login/);
    });

    test('login then logout works', async ({ page }) => {
        const { email, password } = JSON.parse(fs.readFileSync('tests/e2e/.auth/creds.json', 'utf8'));
        await page.goto('/login');
        await page.fill('#email', email);
        await page.fill('#password', password);
        await page.getByRole('button', { name: 'Sign in' }).click();
        await expect(page).toHaveURL(/\/dashboard/);

        // User dropdown trigger is the button containing the user's name.
        await page.getByRole('button', { name: /E2E User/ }).click();
        await page.getByRole('button', { name: 'Log Out' }).click();
        await page.waitForURL((u) => !/\/dashboard/.test(u.pathname));
        await page.goto('/dashboard');
        await expect(page).toHaveURL(/\/login/);
    });
});
