# Campaign results by MDE

Admin can select **All MDEs** or a named MDE in New Products, Promotions and Promotion Order Tracking. The selection is shared across campaign pages during the current session and resets when the account changes. Sales accounts have no MDE selector and remain scoped to their current outlet assignment.

New-product tracking combines MDE, product, outlet and Sub-channel scope. Summary counts, units and penetration use that scope; status/search only narrow the displayed list, so selecting Ordered does not turn the rate into a misleading 100%. Catalog cards show the selected MDE's assignment results. Selecting an MDE without assignments shows zero and an empty list.

Promotion cards, details, tracking summaries and Excel follow the selected MDE. Tracking export also respects the visible promotion/status/Sub-channel/search filters. Assignment counts represent campaign/outlet records; multiple campaigns can contribute multiple records for the same outlet.

An explicit outlet link from Coverage or tasks selects that outlet's owner before opening its campaign, preventing a previously selected different MDE from hiding the requested outlet. Product/promotion creation, store assignment and existing status updates continue to use their original data sources. Merely changing the MDE filter performs no writes. Authentication, database policies, API contracts, PWA assets and the service worker are unchanged.

Verification: `npm test`, `npm run lint`, `npm run build -- --base=/super-MDE/`, then run a preview and `NODE_PATH=/path/to/playwright/node_modules node scripts/verify-campaign-mde.cjs`. `BASE_URL` and `SCREENSHOT_DIR` are configurable. The browser script uses isolated accounts/data and verifies B1/B2/all/empty groups, combined filters, summary denominators, Excel contents, mobile 320/390 widths, Lao/dark mode, outlet deep links and Sales isolation without production business writes.
