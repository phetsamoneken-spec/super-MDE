# outlet.xlsx schema and import

The only seeded business data comes from `../data/outlet.xlsx`: 1,178 outlets, seven MDEs, one main channel, two channels and 15 Sub-channels. The workbook contains no emails, phone numbers, products, promotions, orders or tasks. None are invented. Repeated outlet names are preserved because the 1,178 outlet codes are unique.

The static application currently uses a separate local **Admin** persona and seven MDE personas. These are not Supabase Auth accounts. The public dataset is bundled in the GitHub Pages app with the owner's explicit permission. This does not provide authentication or database synchronization.

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

No live database has been changed by generating these files. A project URL and authorized database access are required before applying anything remotely. Never place passwords, management tokens or service-role keys in source or the frontend.

- **New project with no existing PromoTrack schema:** run `outlet-fresh-setup.sql` once in the owner's Supabase SQL Editor. This creates the schema, policies, view and all workbook records in a transaction. Supabase supplies the `auth` and `storage` schemas and authenticated/anonymous roles.
- **Existing project:** inspect its table definitions and migration history first. Apply missing migrations in filename order. `20261107000000_outlet_workbook.sql` extends the prior PromoTrack schema without deleting existing data. Do not rerun already-applied policy/trigger migrations.
- Then run `seed.sql`. It upserts reference entities by name and outlets by code, preserving existing IDs and avoiding duplicate imports. It does not delete unrelated existing rows or auth accounts. Replacing non-workbook rows in an existing database requires inspecting those rows and their relationships first; no blind truncation is included.
- There are no fake profile inserts. Create the actual Admin and Sales users through Supabase Auth, then link their real `auth.users.id` values to `profiles`. The Admin profile uses role `admin` and no `mde_id`. Each Sales profile uses role `sales` and the corresponding ID from `mdes`. Keep email/name values tied to the owner's actual accounts.
- RLS gives Admin all outlets, a linked MDE its assigned outlets, and anonymous/unassigned users no outlet rows. Reference data writes require Admin. The current static frontend does not call this database; connecting authenticated runtime reads/writes is a separate prerequisite for live synchronization.

## Reproduce and verify

Run from `promotrack-pro`:

```sh
bun install --frozen-lockfile
npm run data:generate
npm test
npm run lint
npm run build -- --base=/bundo/
```

The generator checks exact headers, completeness, unique codes, and category parents. It emits the JSON used by the frontend, the SQL seed, the fresh-project SQL, and a blank nine-column import template. It does not execute SQL or evaluate spreadsheet formulas.

Tests compare every source cell, exercise the original XLSX importer, preserve old browser data under separate keys, and validate the actual migrations/seed in PGlite PostgreSQL with isolated Auth/Storage test scaffolding. They check repeatable import and Admin/MDE/unassigned/anonymous access. This is local validation, not proof that a remote project was migrated.

After a successful fresh import, query:

```sql
select count(*) from public.outlet_directory; -- 1178
select mde_name, count(*) from public.stores group by mde_name order by mde_name;
```

Expected MDE counts in workbook order: 169, 181, 157, 172, 163, 174, 162.
