import { test, expect } from '@playwright/test';
import { skipUnlessHeavy, uniq, createTask, deleteTaskByTitle } from './helpers.js';

skipUnlessHeavy(test);

const col = (page, id) => page.locator(`[aria-labelledby="col-${id}"]`);

test('three columns visible', async ({ page }) => {
    await page.goto('/tasks/board');
    for (const [id, name] of [['pending', 'Pending'], ['in_progress', 'In Progress'], ['completed', 'Completed']]) {
        await expect(page.locator(`#col-${id}`)).toHaveText(name);
        await expect(col(page, id)).toBeVisible();
    }
});

test('drag card between columns persists after reload', async ({ page }, ti) => {
    const title = uniq('board');
    await createTask(page, { title });
    await page.goto('/tasks/board?search=' + encodeURIComponent(title));

    const card = col(page, 'pending').locator(`[aria-label^="${title}. Press"]`);
    await expect(card).toBeVisible();

    if (ti.project.name.startsWith('mobile')) {
        // Columns are stacked vertically; arrow keys cannot cross lists there, so use a mouse drag with steps.
        await card.scrollIntoViewIfNeeded();
        const target = col(page, 'in_progress');
        await target.scrollIntoViewIfNeeded();
        await card.scrollIntoViewIfNeeded();
        const from = await card.boundingBox();
        const to = await target.boundingBox();
        await page.mouse.move(from.x + 20, from.y + from.height / 2);
        await page.mouse.down();
        await page.mouse.move(from.x + 25, from.y + from.height / 2 + 10, { steps: 5 });
        await page.mouse.move(to.x + to.width / 2, to.y + 60, { steps: 25 });
        await page.waitForTimeout(300);
        await page.mouse.up();
    } else {
        await card.focus();
        await page.keyboard.press('Space');
        await page.keyboard.press('ArrowRight');
        await page.keyboard.press('Space');
    }

    await expect(col(page, 'in_progress').getByText(title)).toBeVisible();
    await page.waitForLoadState('networkidle');

    await page.reload();
    await expect(col(page, 'in_progress').getByText(title)).toBeVisible();
    await expect(col(page, 'pending').getByText(title)).toHaveCount(0);

    // list view agrees
    await page.goto('/tasks?status=in_progress&search=' + encodeURIComponent(title));
    await expect(page.getByText(title, { exact: true }).locator('visible=true').first()).toBeVisible();

    await deleteTaskByTitle(page, title);
});
