# Promotion Tracking & To-Do List PWA

A mobile-first, installable Progressive Web App (PWA) built for sales and marketing teams to track retail store participation in promotional campaigns, identify ordering statuses, automate follow-up workflows, and maintain an audit trail.

---

## 1. System Architecture & Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide Icons, Canvas Confetti.
- **PWA**: Web App Manifest (`/public/manifest.webmanifest`), Service Worker (`/public/sw.js`), 192×192 & 512×512 icons, iOS Add to Home Screen guide, standalone mode detection, offline banner, and draft queue.
- **Data & Excel Processing**: SheetJS (`xlsx`) for parsing, validating, previewing, and batch-importing/exporting `.xlsx`, `.xls`, and `.csv` files.
- **Backend Architecture**: Supabase PostgreSQL, Row Level Security (RLS), Supabase Storage policies, and audit logging.
- **Bilingual Typography**: Native Lao (ພາສາລາວ - Noto Sans Lao) and English (Inter) language switcher with 100% dictionary coverage.

---

## 2. User Roles & Security Matrix

| Capability | Admin Persona | Sales Rep Persona |
| :--- | :---: | :---: |
| View All Stores & Outlets | Yes | No (Only assigned stores) |
| Add, Edit, Delete Stores | Yes | No |
| Batch Excel Import / Export | Yes | Export authorized records only |
| Create & Archive Promotions | Yes | View active promotions only |
| Upload Promotion Posters (Max 5MB) | Yes | Read-only |
| Assign Stores to Promotions | Yes | No |
| Update Order Status (Amount, Date) | Yes | Yes (Only for assigned stores) |
| Follow-up Date & Task Automation | Yes | Yes (Only for assigned stores) |
| View Audit History Log | Yes | Yes (Scoped to assigned stores) |
| Access Full Leadership Dashboard | Yes | Scoped to individual performance |

---

## 3. Database Migrations (Prepared for Review)

All migrations and security policies have been drafted in the `/supabase/migrations/` directory for technical review prior to execution:

1. **`supabase/migrations/20251105000000_initial_schema.sql`**
   - Tables: `profiles`, `channels`, `sub_channels`, `stores`, `promotions`, `promotion_stores`, `follow_up_tasks`, `order_status_history`.
   - Constraints: Unique `store_code`, `promotion_stores(store_id, promotion_id)` uniqueness, foreign keys with appropriate cascade/set null rules, UUID keys.
2. **`supabase/migrations/20251105000001_rls_policies.sql`**
   - Security helper functions: `public.is_admin()` and `public.is_store_assigned_to_me()`.
   - Strict policies preventing sales reps from changing roles or reassigning stores to themselves.
   - Fine-grained UPDATE policies on `promotion_stores`.
3. **`supabase/migrations/20251105000002_storage_policies.sql`**
   - Storage bucket: `promotion-images` (5MB limit, `image/jpeg`, `image/png`, `image/webp`).
   - Admin-only write/replace/delete, authenticated read.
4. **`supabase/seed.sql`**
   - Initial channels (Modern Trade, General Trade, CVS, Wholesale, HORECA), demo users, and seed records.

---

## 4. Excel Import / Export Specification

### Required Import Columns
```text
Store Code | Store Name | Channel | Sub Channel | Assigned Sales
```

### Import Workflow
1. Select `.xlsx`, `.xls`, or `.csv` file (or drag & drop).
2. SheetJS parses workbook headers and records.
3. Live preview shows valid rows, error highlights, and duplicate detections.
4. Duplicate Resolution: Choose **Skip existing stores** or **Update existing stores**.
5. Batch execution applies records with real-time summary.
6. Sample template available at `/public/templates/store_import_template.xlsx`.

---

## 5. Local Demo Personas

Use the **Switch Demo User** button in the header or sidebar to test roles:

1. **Sengdavanh Phommasone (Admin)**
   - Role: `admin`
   - Access: All 15+ stores, all promotions, full Excel import/export center.
2. **Khamphanh Keomany (Sales Rep - Vientiane)**
   - Role: `sales`
   - Access: Scoped strictly to Vientiane outlets (Modern Trade, CVS, Wholesale).
3. **Soulinthone Vongsa (Sales Rep - Luang Prabang)**
   - Role: `sales`
   - Access: Scoped to northern outlets.
4. **Bounmy Sisoulath (Sales Rep - Pakse)**
   - Role: `sales`
   - Access: Scoped to southern outlets.

---

## 6. Local Test Results & Verification

- [x] **PWA Compliance**: Manifest valid, Service Worker active, 192x192 and 512x512 icons present, iOS Add to Home Screen instructions modal verified.
- [x] **Store Management**: Add store validation, duplicate store code detection, filter by channel/sales rep, pagination, delete safety check.
- [x] **Excel Processing**: SheetJS parses test `.xlsx` workbooks, detects duplicate codes, handles skip/update toggles, exports formatted `.xlsx` files with customized column widths.
- [x] **Promotion Workflow**: Create promotion, 5MB file upload validation (JPEG/PNG/WebP), store-promotion assignment, order conversion rate calculation `(Ordered / Participating * 100)`.
- [x] **Order Tracking & Audit**: Status transitions (Not Ordered, Follow-up Required, Ordered, Cancelled), automatic To-Do task generation, timestamped audit log.
- [x] **To-Do List**: Overdue filter, Due Today filter, priority tags, one-click completion with celebration confetti.
- [x] **Bilingual Support**: Instant toggle between English and Lao (ພາສາລາວ) with Lao Unicode font rendering.
- [x] **Compilation**: `npm run build` and `tsc --noEmit` build with 0 errors.

---

## 7. Pre-Deployment Checklist

- [ ] Review `/supabase/migrations/` SQL files with database architect.
- [ ] Connect production Supabase credentials via `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- [ ] Apply migrations via Supabase CLI: `supabase db push`.
- [ ] Verify Row Level Security policies via Supabase test suite.
- [ ] Set custom domain and HTTPS for PWA installation in production.
