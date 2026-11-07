# PromoTrack

React, TypeScript and Vite PWA for outlet management, promotion/order tracking, new product launches, follow-up tasks, and Excel import/export, with Lao/English UI and a self-hosted Noto Sans Lao font.

## Supplied business data

`data/outlet.xlsx` is the only initial business-data source. It contains 1,178 unique outlet codes, seven MDEs, one main channel, two channels, 15 Sub-channels, 114 villages, six districts, and one province. The original Lao names and all nine source columns are preserved. The two repeated outlet names remain separate outlets because their codes differ.

There are no seeded promotions, products, orders, tasks, fake phone numbers, email addresses, or people photos. A separate local **Admin** management persona is retained as requested; it is not assigned to any MDE. Each MDE persona sees its own workbook-assigned outlets.

The owner authorized publication of this dataset in the public static app. These local personas are not secure authentication. The frontend still stores edits in the current browser and does not synchronize with a live Supabase project. See [Supabase schema and import](supabase/README.md) for the prepared schema, exact column mapping, SQL import, real Auth account linkage and database access policies.

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

The deployment workflow uses Node 24 and Bun 1.4.4, runs tests and TypeScript, builds with `npm run build -- --base=/bundo/`, and deploys to GitHub Pages. Build generates the reviewed dataset and SQL from the supplied workbook; it does not execute SQL.

## Existing features

- Store directory, search, channel/Sub-channel/MDE filters, pagination, and outlet details containing all supplied fields.
- Admin Sub-channel creation/deletion with duplicate checks and protection for referenced categories.
- Admin new-product creation/editing/deletion, targeting, store assignment, samples and order tracking.
- Promotion management, order status changes, audit history, follow-up tasks and Excel exports.
- Original nine-column workbook import, validation, duplicate skip/update, blank template download and matching nine-column outlet export.
- Theme, branding/logo upload, Lao/English, PWA install guidance and offline shell/font caching.

Each workbook fingerprint has its own browser storage namespace. This activates only the supplied data and excludes the former demo dataset without deleting the previous browser keys. Theme, language and branding preferences keep their existing keys. Further user edits remain on refresh; code rebuilds do not reset the same dataset.

## Database status

`supabase/migrations/20261107000000_outlet_workbook.sql` extends the schema with MDEs, main channels, explicit location fields, source identifiers and an RLS-preserving nine-column view. `supabase/seed.sql` upserts only workbook records. `supabase/outlet-fresh-setup.sql` is a combined script for a verified fresh project.

Schema and seed are tested in an isolated PostgreSQL engine. Generating or validating SQL does not apply it to a remote Supabase project. Existing remote records must be inspected before reconciliation; the scripts do not blindly delete unrelated data or auth accounts.
