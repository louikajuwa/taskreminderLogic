# Changelog

## [Unreleased] - 2026-10-15

### Added

- **In-app reminders.** When a task's `reminder_at` passes, it now shows up in the app until it is dismissed:
  - A notification bell in the nav bar shows how many reminders are due.
  - The dashboard has a Reminders panel with a **Dismiss** button for each one.
  - Changing a task's reminder time makes it remind you again.
  - Completed tasks never remind.
- **Overdue filter** on the task list (`/tasks?overdue=1`). The dashboard stat cards are now links that open the list already filtered.
- Mobile card layout for the task list.
- Clear-filters button, field labels and a loading spinner in the task filters.
- Separate empty states for "no tasks yet" and "no matching tasks".
- Placeholder text in empty Kanban board columns.
- The app now handles expired sessions (HTTP 419) and network errors with a message instead of failing silently.
- Database factory for attachments (`AttachmentFactory`).
- 44 new PHPUnit tests, bringing the total to 75.
- A Playwright end-to-end suite (`tests/e2e`, `playwright.config.js`, run with `npm run test:e2e`). It runs against 5 screen sizes, from 375px mobile to 1920px desktop.

### Fixed

- **Task list:**
  - Sorting by priority only worked on MySQL; it now works on every supported database.
  - Search treated `%` and `_` as wildcards; they are now matched literally.
  - Invalid or malformed filter and sort parameters fall back to the defaults instead of causing errors.
- **Data safety:**
  - Creating or updating a task with attachments now succeeds or fails as one unit; files from a failed save are removed.
  - Deleting a task removes its database rows before its files.
  - Deleting an account now removes all of that user's uploaded files.
- **Validation:**
  - A task can no longer have more than 10 attachments in total. Previously the limit applied to each upload, not to the task.
  - A reminder can no longer be set later than the task's due date.
- **Kanban board ordering:** positions are recalculated in one locked transaction, so cards no longer end up with duplicate or missing positions.
- **Dashboard:** the overdue count is always current. Previously it was cached for 60 seconds, so it could lag behind the clock.
- **Duplicate actions:** row buttons on the task list and moves on the board can no longer fire twice from rapid clicks.
- **Test setup:** `php artisan test` now works inside the Docker container. Previously the container's cached development settings caused 19 tests to fail with HTTP 419, and tests wrote a stray SQLite file named `task_manager` into the project root.

### Security

- **Rate limits:**
  - Register, forgot-password and reset-password requests are limited to 6 per minute.
  - Changes to tasks and attachments are limited to 60 per minute.
- Only the user's `id`, `name`, `email` and `email_verified_at` are now sent to the browser, not the whole user record.
- An attachment's file type is now detected by the server rather than taken from the browser.
- Pagination labels are rendered as plain text; the raw-HTML rendering (`dangerouslySetInnerHTML`) is gone.

### Changed (UI)

- Buttons, form fields, focus outlines and status/priority badges now share one consistent style.
- The page-loading progress bar now uses the brand's indigo color.
- Accessibility:
  - Screen-reader labels on icon-only buttons and the mobile menu button.
  - Form errors are announced and linked to the field they belong to.
  - The show/hide password button can be reached with the keyboard.
  - Page headings follow a correct order.
- The dashboard's overdue pop-up now appears once per browser session instead of on every visit.
- The dashboard counts are now calculated in a single database query instead of five.

### Database

- New migration `2026_10_15_000001_add_reminder_dismissed_at_to_tasks_table`. It adds a nullable `reminder_dismissed_at` column and an index on `(user_id, reminder_at)`. It only adds to the schema and can be rolled back.

### Configuration and setup

- `phpunit.xml`:
  - Settings are now forced (`force="true"`), and `<server>` overrides were added for the database connection and database name.
  - The config and events cache paths now point to files that don't exist, so tests never load the development cache.
- `package.json`: added the `@playwright/test` 1.56.1 dev dependency and the `test:e2e` script.
- `.gitignore`: now ignores `playwright-report/`, `test-results/` and `tests/e2e/.auth/`.
- After deploying, run `php artisan migrate`. On Docker the app container already runs this when it starts.
- To run the end-to-end suite, see the `docker run` command in `TEST_REPORT.md`.
