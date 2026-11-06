# GitHub Pages

This directory contains the uploaded PromoTrack app. The existing repository-root
POS files are preserved.

In repository Settings > Pages, select **GitHub Actions** as the build source.
The `Deploy PromoTrack to GitHub Pages` workflow runs when this directory or its
workflow changes on `main`, and can also be run manually in Actions.

The workflow installs `bun.lock` with Bun 1.4.4, runs the TypeScript check, builds
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
removed. The remote Supabase integration remains an unimplemented demo feature.

The workflow publishes PromoTrack as this repository's Pages site. It does not
delete the preserved POS source at the repository root.
