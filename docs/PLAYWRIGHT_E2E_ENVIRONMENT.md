# Playwright E2E Environment

Status: Blocked pending CI/build when the host cannot install Linux browser system libraries.

URAI Spatial keeps `lock:e2e` as a required production gate. Do not bypass it for production certification.

## Why local E2E can fail

Playwright Chromium requires native Linux runtime libraries. In restricted sandboxes, Chromium may fail before tests run with an error like:

```text
error while loading shared libraries: libXext.so.6: cannot open shared object file: No such file or directory
```

Running `pnpm playwright:install-deps` may also fail if the process cannot switch to root:

```text
Switching to root user to install dependencies...
su: Permission denied
Failed to install browser dependencies
```

That failure means the host/container lacks system package permissions. It is not a TypeScript, Next.js build, route, Firestore, or URAI Spatial runtime-code failure.

## Local host with sudo/root

Use:

```bash
pnpm exec playwright install chromium
sudo pnpm exec playwright install-deps chromium
pnpm playwright:ensure
pnpm lock:all
```

If `sudo pnpm ...` is unavailable, run the underlying Playwright install-deps command from an environment where package installation is allowed.

## CI

The repository includes `.github/workflows/urai-spatial-lock.yml`.

The workflow runs on `ubuntu-24.04` and performs:

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm playwright:ensure
pnpm lock:all
```

## Production certification

Production certification is not granted unless all of the following pass:

- install
- Life Map/unit tests
- typecheck
- build
- `lock:static`
- `lock:build`
- `lock:e2e`
- deployment smoke
- Tier 5 signoff
