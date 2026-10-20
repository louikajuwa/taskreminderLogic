import { test, expect } from '@playwright/test';
import { skipUnlessHeavy, uniq, dtLocal, createTask, deleteTaskByTitle } from './helpers.js';

skipUnlessHeavy(test);

test('past reminder shows in bell + dashboard, Dismiss removes it', async ({ page }) => {
    const title = uniq('remind');
    await createTask(page, { title, reminder: dtLocal(-1), due: dtLocal(3) });

    await page.goto('/dashboard');
    const panel = page.locator('#reminders');
    await expect(panel).toBeVisible();
    await expect(panel.getByText(title, { exact: true })).toBeVisible();

    // On mobile the bell lives inside the hamburger menu.
    const burger = page.getByRole('button', { name: /main menu/i });
    if (await burger.isVisible()) await burger.click();
    const bell = page.getByRole('link', { name: /\d+ reminders? due/ }).locator('visible=true').first();
    await expect(bell).toBeVisible();
    const before = parseInt((await bell.getAttribute('aria-label')).match(/\d+/)[0], 10);
    expect(before).toBeGreaterThanOrEqual(1);

    await panel.getByRole('button', { name: `Dismiss reminder: ${title}` }).click();
    await expect(page.locator('#reminders').getByText(title, { exact: true })).toHaveCount(0);

    if (before === 1) {
        await expect(page.getByRole('link', { name: 'No reminders due' }).locator('visible=true').first()).toBeVisible();
    } else {
        await expect(page.getByRole('link', { name: `${before - 1} ${before - 1 === 1 ? 'reminder' : 'reminders'} due` })
            .locator('visible=true').first()).toBeVisible();
    }

    await page.reload();
    await expect(page.locator('#reminders').getByText(title, { exact: true })).toHaveCount(0);
    await deleteTaskByTitle(page, title);
});
