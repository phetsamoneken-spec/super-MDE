# Outlet visit coverage

Implemented on `feat/outlet-visit-coverage`. The owner explicitly approved the additive live schema and Coverage publication on 2026-11-08.

## Behavior

- Open **Visit Coverage** from the sidebar or dashboard card. Monthly reporting is the default; daily reporting is also available. Business dates use UTC+7 (`Asia/Bangkok`).
- Coverage is distinct visited outlets divided by currently active, assigned outlets. Repeat visits do not inflate coverage. Search/status filters affect the directory and export, not the denominator.
- MDE accounts record visits to their currently assigned outlets, once per outlet/MDE/day. They can edit their own notes and delete their own records with confirmation. Visit dates and actor identities cannot be edited.
- Admin reads all visits, filters by MDE, and compares coverage plus current promotion/new-product order counts. Admin cannot create visits on behalf of an MDE.
- Campaign figures describe current orders even for a past visit month. Campaign buttons open existing tracking screens.
- History retains the original MDE/actor after assignment/account changes. A previous MDE's visits do not count toward a new MDE's assignment. Deleting an outlet through the existing store feature also deletes its visit history.
- Visit reads/writes require internet. No offline visit synchronization or GPS verification is added. Existing offline order/task behavior is unchanged.
- History loads 20 records at a time; the directory shows 50 outlets per page. Excel exports the entire filtered directory, including repeat-visit and current campaign counts.

## Database and rollout

`supabase/migrations/20261108020000_outlet_visit_coverage.sql` creates only `outlet_visits`, its indexes/trigger/RLS policies, and three helper functions. Existing tables, authentication, roles, sync RPC, manifest and service worker are unchanged. The aggregate RPC returns one JSON value to avoid PostgREST's row limit above 1,000 outlets; invoker rights preserve RLS.

The approved production rollout uses these steps:

1. Apply the incremental migrations `20261108020000_outlet_visit_coverage.sql` and `20261108030000_outlet_visit_function_grants.sql` to the designated project. The second explicitly revokes anonymous function access when Supabase default privileges grant it. Do not run fresh setup or seed against the existing project.
2. Verify RLS, column/function grants and PostgREST schema visibility. The table initially contains no visits.
3. Publish the reviewed feature commit through the existing main-branch workflow. Preserve retained premium-motion preview assets.
4. Verify the live app loads and authenticated Coverage requests succeed. Real MDE users record actual visits.

A frontend rollback does not require deleting the new table or its visit history. Review any schema rollback separately to avoid data loss.

### Production verification — 2026-11-08

Both incremental migrations were applied to the designated Supabase project. Existing table counts were unchanged. RLS is enabled with four visit policies; anonymous table/function access is denied, authenticated aggregation is allowed, and clients cannot supply the visit actor. A single rolled-back transaction verified MDE insertion, server-stamped ownership, note updates and MDE/Admin aggregation; no test visits remain.

Coverage was published at [Super MDE](https://phetsamoneken-spec.github.io/super-MDE/) through the existing Pages workflow. CI passed all 29 tests, TypeScript and the production build. The live JavaScript matched the reviewed build, the existing premium-motion preview remained reachable, and the signed-in browser fixture regression passed against the live site. Actual password login was not automated; the unsigned login screen and database role enforcement were verified without changing accounts or passwords.

## Verification

```sh
npm test
npm run lint
npm run build -- --base=/super-MDE/
npm run preview -- --host 0.0.0.0 --port 4176 --strictPort --base=/super-MDE/
# In another terminal, using an available Playwright Core installation:
NODE_PATH=/path/to/playwright/node_modules node scripts/verify-coverage.cjs
```

SQL tests use isolated PGlite databases and the supplied 1,178-outlet workbook. They cover scoped access, actor spoofing, duplicate/future visits, immutable identity/date, account removal, outlet deletion and aggregation above 1,000 outlets. Browser checks mock all authenticated requests and use labelled fixture outlets; they create no production visits or accounts. They verify Admin/MDE views, record/history/note conflicts/deletion, daily/monthly reports, campaign navigation, Excel content, 320/390 widths, Lao/dark mode, offline writes, failed reads and retry recovery.

The build retains its existing large-bundle warning. No dependencies were added.
