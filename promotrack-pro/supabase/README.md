# outlet.xlsx schema and import

The only seeded business data comes from `../data/outlet.xlsx`: 1,178 outlets, seven MDEs, one main channel, two channels and 15 Sub-channels. The workbook contains no emails, phone numbers, products, promotions, orders or tasks. None are invented. Repeated outlet names are preserved because the 1,178 outlet codes are unique.

The production application uses real Supabase Auth accounts. The public source dataset remains bundled with the owner’s permission; database reads/writes require authentication and RLS. The seven MDE records are business references, not login accounts.

## Exact column mapping

| Workbook header (original spelling) | PostgreSQL column |
| --- | --- |
| MDE NAME | stores.mde_name; mdes.name via stores.mde_id |
| OUTLET CODE | stores.store_code (unique) |
| OUTLET | stores.store_name |
| MIAN CHANEL | stores.main_channel; main_channels.name |
| CHENEL | stores.channel; channels.name |
| SUB-CHANEL | stores.sub_channel; sub_channels.name |
| VILLAG | stores.village |
| DISTRICT | stores.district |
| PROVINCE | stores.province |

`public.outlet_directory` exposes precisely the nine original header names. Its `security_invoker` setting preserves the caller's row-level security. Source names and Lao spelling are retained exactly. UUIDs are deterministic technical identifiers; timestamps in PostgreSQL record actual database import times. The local source has blank business timestamps because none were supplied.

## Apply to a verified project

Generating these files never executes SQL. The designated project `olvteqslbxwzifdfueug` has now received the source import and connected runtime migration after inspection and testing. Never place passwords, management tokens or service-role keys in source or the frontend.

- **New project with no existing PromoTrack schema:** run `outlet-fresh-setup.sql` once in the owner's Supabase SQL Editor. This creates the schema, policies, view and all workbook records in a transaction. Supabase supplies the `auth` and `storage` schemas and authenticated/anonymous roles.
- **Existing project:** inspect its table definitions and migration history first. Apply missing migrations in filename order. `20261107000000_outlet_workbook.sql` extends the prior PromoTrack schema without deleting existing data. Do not rerun already-applied policy/trigger migrations.
- Then run `seed.sql`. It upserts reference entities by name and outlets by code, preserving existing IDs and avoiding duplicate imports. It does not delete unrelated existing rows or auth accounts. Replacing non-workbook rows in an existing database requires inspecting those rows and their relationships first; no blind truncation is included.
- There are no fake profile inserts. Users register in the app and confirm their email. `ensure_my_profile()` creates a profile only for a verified account. The owner’s designated email is stored privately in `app_admin_allowlist`; it grants Admin with no MDE assignment. Other accounts start unassigned; Admin selects their MDE in User Management. Only privileged SQL may change the allowlist.
- RLS gives Admin all outlets, a linked MDE its assigned outlets, and anonymous/unassigned users no outlet rows. Reference data writes require Admin. The frontend loads paginated database records, translates existing app models, and saves through the transactional `app_apply_changes` RPC under the caller’s RLS. Images use Supabase Storage.

## Reproduce and verify

Run from `promotrack-pro`:

```sh
bun install --frozen-lockfile
npm run data:generate
npm test
npm run lint
npm run build -- --base=/super-MDE/
```

The generator checks exact headers, completeness, unique codes, and category parents. It emits the JSON used by the frontend, the SQL seed, the fresh-project SQL, and a blank nine-column import template. It does not execute SQL or evaluate spreadsheet formulas.

Tests compare every source cell, exercise the original XLSX importer, preserve old browser data under separate keys, and validate the actual migrations/seed in PGlite PostgreSQL with isolated Auth/Storage test scaffolding. They check repeatable import and Admin/MDE/unassigned/anonymous access. Local tests also verify transactional RPC rollback, version conflicts, assigned Sales order/task updates, and verified-email Admin provisioning. Separately, the designated live database was checked for exact source parity and authenticated RPC writes inside a rolled-back transaction.

After a successful fresh import, query:

```sql
select count(*) from public.outlet_directory; -- 1178
select mde_name, count(*) from public.stores group by mde_name order by mde_name;
```

Expected MDE counts in workbook order: 169, 181, 157, 172, 163, 174, 162.

## Account activation

Set Authentication → URL Configuration Site URL and Redirect URL to `https://phetsamoneken-spec.github.io/super-MDE/`. This remains a manual Dashboard step because the available management credential lacks `auth_config_read`/write access. Register with the designated owner email and a password chosen privately, confirm the email, then sign in. No owner password, Auth account, or email invitation was created during setup.

Deleting an app profile removes its assignment, not the Supabase Auth account. Use Supabase Authentication to disable/delete a login. A deleted profile may be recreated as unassigned on its next sign-in; a verified allowlisted owner regains Admin.

## Admin adds Sales users (B1–B7)

In User Management choose **Add user**, enter the colleague’s name and email, and select B1–B7. `admin_assign_user` checks Admin privileges on the server. For an already verified Auth account it creates/updates its Sales profile immediately. Otherwise it stores pending access in the Admin-only `app_user_assignments` table. The colleague registers using the same email, chooses their password, and confirms their email. `ensure_my_profile` consumes the matching pending assignment once. No invitation or email is sent by adding an assignment, and no password or Auth secret is handled by Admin’s browser.

Pending assignments can be edited or deleted. Existing user profiles retain the Edit action for changing MDE. The database applies the assignment to every outlet read/write through existing RLS, not just frontend filtering. Admin accounts cannot be converted to Sales via this function. Sales and anonymous callers cannot create assignments or read their list. The migration is `20261107020000_user_assignments.sql`.
