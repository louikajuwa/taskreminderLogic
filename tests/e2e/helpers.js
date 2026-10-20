import { expect } from '@playwright/test';

export const HEAVY = ['desktop-1366', 'mobile-375'];

/** Call at top level of a spec: skips the whole file unless on a heavy project. */
export const skipUnlessHeavy = (test) =>
    test.beforeEach(({}, testInfo) => {
        test.skip(!HEAVY.includes(testInfo.project.name), 'heavy spec: limited projects');
    });

/** Collect console errors, page errors, failed requests and 5xx responses. */
export function watchErrors(page) {
    const problems = [];
    page.on('console', (m) => {
        if (m.type() === 'error') problems.push(`console: ${m.text()} @ ${m.location().url}`);
    });
    page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
    page.on('requestfailed', (r) => problems.push(`requestfailed: ${r.url()} ${r.failure()?.errorText}`));
    page.on('response', (r) => {
        if (r.status() >= 500) problems.push(`http ${r.status()}: ${r.url()}`);
    });
    return problems;
}

export const uniq = (p = 'T') => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** datetime-local string offset by days/hours from now. */
export function dtLocal(days, hours = 0) {
    const d = new Date(Date.now() + days * 864e5 + hours * 36e5);
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export async function openNewTask(page) {
    await page.goto('/tasks');
    await page.getByRole('button', { name: '+ New Task' }).first().click();
    await expect(page.getByRole('heading', { name: 'New Task' })).toBeVisible();
}

export async function createTask(page, { title, description, status, priority, due, reminder } = {}) {
    await openNewTask(page);
    await page.fill('#title', title);
    if (description) await page.fill('#description', description);
    if (status) await page.selectOption('#status', status);
    if (priority) await page.selectOption('#priority', priority);
    if (due) await page.fill('#due_date', due);
    if (reminder) await page.fill('#reminder_at', reminder);
    await page.getByRole('button', { name: 'Create task' }).click();
    await expect(page.getByRole('heading', { name: 'New Task' })).toBeHidden();
}

/** Delete a task by exact title through the list view. Best-effort cleanup. */
export async function deleteTaskByTitle(page, title) {
    await page.goto('/tasks?search=' + encodeURIComponent(title));
    const btn = page.getByRole('button', { name: `Delete task: ${title}` }).locator('visible=true').first();
    if (!(await btn.count())) return;
    await btn.click();
    await page.getByRole('button', { name: 'Yes, delete it' }).click();
    await expect(page.getByRole('button', { name: `Delete task: ${title}` })).toHaveCount(0);
}

export const visibleText = (page, text) => page.getByText(text, { exact: true }).locator('visible=true').first();
