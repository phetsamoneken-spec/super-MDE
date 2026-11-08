# Store forms, Lao calendar and task creation

Requested by the owner on 2026-11-09:

- Store Sub-channel is a select list filtered by Channel. Reference categories and existing outlet category names are preserved; switching Channel chooses a valid category for the new channel.
- All date/month fields use an in-app Lao calendar, including when Android/browser language is Thai or English. Saved values remain Gregorian ISO dates/months. Required fields, minimum/maximum dates, keyboard navigation, cancellation and nested modal focus are supported. No date library or PWA configuration change is required.
- Only Admin can create tasks, including automatic follow-ups. Creation controls are hidden from MDE accounts, the data service rejects creation, and the task INSERT policy requires `is_admin()`. MDE accounts retain existing task update/completion permissions.
- New task assignment follows the selected store's MDE. Admin can create assigned work without making it a personal Admin task by default.

The owner's explicit task-permission request authorizes the narrowly scoped migration `20261109000000_admin_task_creation.sql`. Apply only that migration to the existing project; do not run fresh setup or seed. Existing `app_apply_changes` first updates existing rows and then inserts missing rows, so this INSERT restriction preserves MDE task updates through the current API.

Validation includes isolated SQL tests for Admin creation, MDE creation rejection through direct SQL and the existing RPC, atomic batch rollback and MDE completion; service permission tests; leap-day/ISO calendar utilities; and browser checks under Thai locale covering select persistence, Lao months/days, date limits, required inputs, 320/390 widths, dark mode, nested calendar cancellation and assigned-task completion. Browser business requests use fixtures; no test accounts or business rows are created in production.

Run `npm test`, `npm run lint`, then `npm run build -- --base=/super-MDE/`. With a preview server on port 4176 and Playwright Core available, run `NODE_PATH=/path/to/playwright/node_modules node scripts/verify-store-calendar-tasks.cjs`. `BASE_URL` and `SCREENSHOT_DIR` can point to another preview and output directory.
