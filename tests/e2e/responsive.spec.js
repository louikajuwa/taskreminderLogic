import { test, expect } from '@playwright/test';

const PATHS = ['/dashboard', '/tasks', '/tasks/board', '/profile'];

for (const path of PATHS) {
    test(`no horizontal overflow on ${path}`, async ({ page }) => {
        await page.goto(path);
        await page.waitForLoadState('networkidle');
        const m = await page.evaluate(() => ({
            sw: document.documentElement.scrollWidth,
            iw: window.innerWidth,
        }));
        expect(m.sw, `scrollWidth ${m.sw} > innerWidth ${m.iw}`).toBeLessThanOrEqual(m.iw + 1);
    });
}

test('guest pages have no horizontal overflow', async ({ browser, baseURL }, ti) => {
    const ctx = await browser.newContext({ baseURL, viewport: ti.project.use.viewport });
    const page = await ctx.newPage();
    for (const p of ['/', '/login', '/register']) {
        await page.goto(p);
        await page.waitForLoadState('networkidle');
        const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
        expect(m.sw, `${p}: scrollWidth ${m.sw} > ${m.iw}`).toBeLessThanOrEqual(m.iw + 1);
    }
    await ctx.close();
});

test('hamburger toggles mobile menu on mobile', async ({ page }, ti) => {
    test.skip(!ti.project.name.startsWith('mobile'), 'mobile only');
    await page.goto('/dashboard');
    const btn = page.getByRole('button', { name: /main menu/i });
    await expect(btn).toBeVisible();
    await expect(btn).toHaveAttribute('aria-expanded', 'false');
    await btn.click();
    await expect(btn).toHaveAttribute('aria-expanded', 'true');
    const menu = page.locator('#mobile-menu');
    await expect(menu.getByRole('link', { name: 'Tasks' })).toBeVisible();
    await btn.click();
    await expect(btn).toHaveAttribute('aria-expanded', 'false');
    await expect(menu.getByRole('link', { name: 'Tasks' })).toBeHidden();
});
