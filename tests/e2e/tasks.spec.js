import { test, expect } from '@playwright/test';
import { skipUnlessHeavy, uniq, dtLocal, openNewTask, createTask, deleteTaskByTitle, visibleText, watchErrors } from './helpers.js';

skipUnlessHeavy(test);

const rowFor = (page, title) =>
    page.locator('tr, li').filter({ has: page.getByText(title, { exact: true }) }).locator('visible=true').first();

test('create task with unicode/HTML title renders as text', async ({ page }) => {
    const problems = watchErrors(page);
    const title = `Tâche ✓ <b>x</b> ${uniq()}`;
    await createTask(page, { title, description: 'desc <i>raw</i>' });
    await expect(visibleText(page, title)).toBeVisible();
    // not interpreted as HTML
    await expect(page.locator('main b, table b, ul b').filter({ hasText: /^x$/ })).toHaveCount(0);
    await deleteTaskByTitle(page, title);
    expect(problems, problems.join('\n')).toEqual([]);
});

test('empty title shows validation error', async ({ page }) => {
    await openNewTask(page);
    await page.fill('#title', '   ');
    await page.getByRole('button', { name: 'Create task' }).click();
    await expect(page.locator('#title-error')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'New Task' })).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
});

test('reminder after due date shows error', async ({ page }) => {
    await openNewTask(page);
    await page.fill('#title', uniq('rem-bad'));
    await page.fill('#due_date', dtLocal(1));
    await page.fill('#reminder_at', dtLocal(3));
    await page.getByRole('button', { name: 'Create task' }).click();
    await expect(page.locator('#reminder_at-error')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
});

test('edit, complete/reopen, and delete (cancel then confirm)', async ({ page }) => {
    const title = uniq('crud');
    const edited = title + '-edited';
    await createTask(page, { title });
    await expect(visibleText(page, title)).toBeVisible();

    // edit
    await page.getByRole('button', { name: `Edit task: ${title}` }).locator('visible=true').click();
    await expect(page.getByRole('heading', { name: 'Edit Task' })).toBeVisible();
    await page.fill('#title', edited);
    await page.selectOption('#priority', 'high');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByRole('heading', { name: 'Edit Task' })).toBeHidden();
    await expect(visibleText(page, edited)).toBeVisible();
    await expect(visibleText(page, title)).toHaveCount(0);

    // toggle complete
    await page.getByRole('button', { name: `Mark complete: ${edited}` }).locator('visible=true').click();
    await expect(page.getByRole('button', { name: `Reopen: ${edited}` }).locator('visible=true')).toBeVisible();
    await expect(rowFor(page, edited)).toContainText(/completed/i);
    await page.getByRole('button', { name: `Reopen: ${edited}` }).locator('visible=true').click();
    await expect(page.getByRole('button', { name: `Mark complete: ${edited}` }).locator('visible=true')).toBeVisible();

    // delete: cancel keeps
    const del = page.getByRole('button', { name: `Delete task: ${edited}` }).locator('visible=true');
    await del.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).last().click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(visibleText(page, edited)).toBeVisible();

    // delete: confirm removes
    await del.click();
    await page.getByRole('button', { name: 'Yes, delete it' }).click();
    await expect(visibleText(page, edited)).toHaveCount(0);
    await page.reload();
    await expect(page.getByText(edited, { exact: true })).toHaveCount(0);
});

test('search with literal % and status filter and clear filters', async ({ page }) => {
    const tag = uniq('flt');
    const a = `${tag} 100% done`;
    const b = `${tag} other`;
    await createTask(page, { title: a });
    await createTask(page, { title: b, status: 'in_progress' });

    await page.goto('/tasks');
    const search = page.locator('#tasks\\.index-search');
    await search.fill('%');
    await expect(page).toHaveURL(/search=%25/);
    await expect(visibleText(page, a)).toBeVisible();
    await expect(page.getByText(b, { exact: true })).toHaveCount(0);

    // "100%" should match literally, not as wildcard
    await search.fill(tag);
    await expect(visibleText(page, b)).toBeVisible();

    // status filter
    await page.locator('#tasks\\.index-status').selectOption('in_progress');
    await expect(page).toHaveURL(/status=in_progress/);
    await expect(visibleText(page, b)).toBeVisible();
    await expect(page.getByText(a, { exact: true })).toHaveCount(0);

    // clear filters
    await page.getByRole('button', { name: 'Clear filters' }).first().click();
    await expect(page).not.toHaveURL(/status=|search=/);
    await expect(search).toHaveValue('');

    await deleteTaskByTitle(page, a);
    await deleteTaskByTitle(page, b);
});

test('overdue filter link from dashboard', async ({ page }) => {
    const title = uniq('over');
    await createTask(page, { title, due: dtLocal(-3) });
    await page.goto('/dashboard');
    await page.locator('a[href*="overdue=1"]').locator('visible=true').first().click();
    await expect(page).toHaveURL(/overdue=1/);
    await expect(page.getByText('Overdue filter on')).toBeVisible();
    await expect(visibleText(page, title)).toBeVisible();
    await page.getByRole('button', { name: 'Clear filters' }).first().click();
    await expect(page).not.toHaveURL(/overdue=1/);
    await deleteTaskByTitle(page, title);
});

test('pagination appears with more than 10 tasks', async ({ page }) => {
    test.setTimeout(180_000);
    const tag = uniq('pg');
    const titles = Array.from({ length: 11 }, (_, i) => `${tag}-${String(i).padStart(2, '0')}`);
    for (const t of titles) await createTask(page, { title: t });

    await page.goto('/tasks?search=' + tag);
    const nav = page.getByRole('navigation', { name: 'Pagination' });
    await expect(nav).toBeVisible();
    await nav.getByRole('link', { name: '2', exact: true }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(nav.locator('[aria-current="page"]')).toHaveText('2');
    await expect(page).toHaveURL(/search=/); // query string preserved

    for (const t of titles) await deleteTaskByTitle(page, t);
});
