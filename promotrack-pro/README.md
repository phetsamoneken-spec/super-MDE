# PromoTrack

React, TypeScript and Vite PWA for outlet management, promotion/order tracking, new product launches, follow-up tasks, and Excel import/export, with Lao/English UI and a self-hosted Noto Sans Lao font.

## Supplied business data

`data/outlet.xlsx` is the only initial business-data source. It contains 1,178 unique outlet codes, seven MDEs, one main channel, two channels, 15 Sub-channels, 114 villages, six districts, and one province. The original Lao names and all nine source columns are preserved. The two repeated outlet names remain separate outlets because their codes differ.

There are no seeded promotions, products, orders, tasks, fake phone numbers, email addresses, or people photos. Admin is a separate verified Supabase Auth account, with no MDE assignment. Sales accounts are linked to one of the seven supplied MDEs by Admin.

The app now uses Supabase Auth and the live database at `olvteqslbxwzifdfueug.supabase.co`. Reads and atomic writes enforce database row-level security; Admin sees all outlets, Sales sees its assigned MDE, and unassigned/anonymous accounts see none. The owner authorized publication of the bundled source dataset. See [Supabase setup](supabase/README.md) for account activation and schema details.

## Development

Use the existing checkout; cloud tasks are isolated, so do not create a Git worktree unless explicitly requested.

```sh
cd /workspace/bundo/promotrack-pro
export PATH="/workspace/.tools/bun-1.4.4/node_modules/.bin:$PATH"
bun install --frozen-lockfile
npm run data:generate
npm test
npm run lint
npm run dev -- --strictPort
```

The deployment workflow uses Node 24 and Bun 1.4.4, runs tests and TypeScript, builds with `npm run build -- --base=/super-MDE/`, and deploys to GitHub Pages. Build generates the reviewed dataset and SQL from the supplied workbook; it does not execute SQL.

## Existing features

- Store directory, search, channel/Sub-channel/MDE filters, pagination, and outlet details containing all supplied fields.
- Admin Sub-channel creation/deletion with duplicate checks and protection for referenced categories.
- Admin new-product creation/editing/deletion, targeting, store assignment, samples and order tracking.
- Promotion management, order status changes, audit history, follow-up tasks and Excel exports.
- Dashboard photo cards for saved promotions and new products, with clear empty/image fallback states.
- To-do includes a new-product purchases view even when there are no tasks, plus outlet/product-specific order details and navigation from each task.
- Original nine-column workbook import, validation, duplicate skip/update, blank template download and matching nine-column outlet export.
- Theme, branding/logo upload, Lao/English, PWA install guidance and offline shell/font caching.

Connected data is cached in IndexedDB per project and Auth user. Offline edits are retained and retried on reconnect; version conflicts require review/reload. Theme, language and branding remain device preferences. Old local data is preserved separately and is never automatically imported into the database. Explicit `VITE_SUPABASE_ENABLED=false` enables the original local-only mode for development.

## Database status

`supabase/migrations/20261107000000_outlet_workbook.sql` extends the schema with MDEs, main channels, explicit location fields, source identifiers and an RLS-preserving nine-column view. `supabase/seed.sql` upserts only workbook records. `supabase/outlet-fresh-setup.sql` is a combined script for a verified fresh project.

Schema and seed are tested in an isolated PostgreSQL engine. Generating or validating SQL does not apply it to a remote Supabase project. Existing remote records must be inspected before reconciliation; the scripts do not blindly delete unrelated data or auth accounts.

The initial source import and connected runtime migration were applied to the designated live project. All 1,178 records matched the nine workbook columns. Authenticated RPC create/delete was verified in a rolled-back transaction. No production test user or email invitation was created. The owner must register and verify their own account before a real owner session can be verified.
