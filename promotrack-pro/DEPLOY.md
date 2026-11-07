# GitHub Pages

This directory contains the uploaded PromoTrack app. The existing repository-root
POS files are preserved.

In repository Settings > Pages, select **GitHub Actions** as the build source.
The `Deploy PromoTrack to GitHub Pages` workflow runs when this directory or its
workflow changes on `main`, and can also be run manually in Actions.

The workflow installs `bun.lock` with Bun 1.4.4, runs app/database tests and the TypeScript check, builds
with the Pages base path, and deploys `dist`. No backend credentials are required
for the existing localStorage demo. The expected project URL is
https://phetsamoneken-spec.github.io/bundo/ after a successful deployment.

Local validation:

```sh
cd /workspace/bundo/promotrack-pro
bun install --frozen-lockfile
npm run lint
npm run build -- --base=/bundo/
```

Manifest icons, service worker scope, offline navigation fallback, and the Excel
template use the deployment base path. Service worker registration also works
when React initializes after the page load event. No existing app feature is
removed. Live Supabase synchronization is not connected.

The initial business dataset comes only from the owner's `data/outlet.xlsx`:
1,178 outlets and seven MDEs, with a separate local Admin persona. The owner
authorized publication in this public static app. Builds generate the dataset
and SQL files, but do not apply migrations to Supabase. See `supabase/README.md`
for the exact schema and requirements for applying it to a remote project.

The workflow publishes PromoTrack as this repository's Pages site. It does not
delete the preserved POS source at the repository root.
