import { test, expect } from '@playwright/test';
import { watchErrors } from './helpers.js';

const PAGES = [
    ['Dashboard', '/dashboard', 'Dashboard'],
    ['Tasks', '/tasks', 'Tasks'],
    ['Board', '/tasks/board', 'Board'],
    ['Profile', '/profile', null],
];

for (const [name, path, heading] of PAGES) {
    test(`${name} loads without console errors or failed requests`, async ({ page }) => {
        const problems = watchErrors(page);
        const resp = await page.goto(path);
        expect(resp.status()).toBe(200);
        await page.waitForLoadState('networkidle');
        if (heading) await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible();
        else await expect(page.locator('main')).toContainText(/profile/i);
        expect(problems, problems.join('\n')).toEqual([]);
    });
}
