# Super MDE motion preview deployment

This branch publishes an approved online review of feature commit `4575bb3`
at `/super-MDE/preview/premium-motion/`.

The production root is copied byte-for-byte from the successful Pages artifact
for `98c853a3d1eccb201828d473a6a5b63aca662bc9`, run `42466099750`.
`preview-production-integrity.json` records every original SHA-256. The build
fails if any production file differs. The existing workflow is unchanged and
is dispatched explicitly on this branch; nothing is merged into `main`.

The preview uses the existing login, APIs and Supabase data. Source auth, roles,
services, database tables and production PWA files are unchanged. It contains
no browser-test fixture campaigns or test credentials.

Preview-only output uses relative asset URLs and an isolated service-worker
cache prefix so activating the review app cannot delete production caches.
The original production service worker and manifest remain byte-identical.
