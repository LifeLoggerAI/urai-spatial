# Playwright E2E Setup

URAI Spatial E2E tests use Playwright Chromium. Linux runners need both the npm package and Chromium system libraries.

## Local setup

```bash
pnpm install
pnpm playwright:ensure
pnpm test:e2e
```

If package installation is restricted, run these manually in an environment that can install OS packages:

```bash
pnpm playwright:install
pnpm playwright:install-deps
pnpm test:e2e
```

## CI setup

Use this sequence before spatial E2E tests:

```bash
corepack enable
corepack prepare pnpm@8.15.9 --activate
pnpm install --frozen-lockfile
pnpm playwright:ensure
pnpm test:e2e
```

## Why this exists

The common failure is Chromium exiting before tests start because a library such as `libglib-2.0.so.0` is unavailable. The repo now runs a preflight first, so E2E commands fail early with setup instructions instead of waiting for the app to compile.
