import { chromium } from '@playwright/test';
import fs from 'node:fs';

export default async function globalSetup() {
    const baseURL = process.env.E2E_BASE_URL || 'http://localhost:8090';
    fs.mkdirSync('tests/e2e/.auth', { recursive: true });
    const email = `e2e-${Date.now()}@example.com`;
    const browser = await chromium.launch();
    const context = await browser.newContext({ baseURL });
    const page = await context.newPage();
    await page.goto('/register');
    await page.fill('#name', 'E2E User');
    await page.fill('#email', email);
    await page.fill('#password', 'Passw0rd!e2e');
    await page.fill('#password_confirmation', 'Passw0rd!e2e');
    await page.getByRole('button', { name: 'Create account' }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
    await context.storageState({ path: 'tests/e2e/.auth/user.json' });
    fs.writeFileSync('tests/e2e/.auth/creds.json', JSON.stringify({ email, password: 'Passw0rd!e2e' }));
    await browser.close();
    console.log(`[e2e] registered ${email}`);
}
