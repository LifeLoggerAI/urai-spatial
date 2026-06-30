# URAI Security and Dependency Notes

## Current known launch warning

Recent Firebase/Next build logs reported a warning that `next@15.5.7` has a security advisory and should be upgraded to a patched version.

## Safe closeout position

- Do not perform a rushed major framework change during the visual launch closeout.
- Complete the visual proof, route proof, and screenshot receipts first.
- Then run a controlled patch upgrade branch for Next and related config.

## Recommended controlled upgrade path

1. Create a branch such as `next-security-patch`.
2. Upgrade Next and `eslint-config-next` together to the patched compatible release.
3. Keep React and React DOM pinned unless the Next release notes require changes.
4. Run install, typecheck, unit tests, build, and route smoke checks.
5. Deploy to a preview/staging target before production.
6. Merge only when visual routes and SSR hosting still work.

## Remaining warnings to document, not hide

- Firebase framework support for Next.js is an early preview and may produce best-effort warnings.
- Cloud Shell may run a newer Node version than Firebase framework tooling expects.
- Provider keys and billing-gated services cannot be fully proven without real credentials and account access.
