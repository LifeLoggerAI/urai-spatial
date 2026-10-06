# URAI Security and Dependency Notes

## Controlled security patch — 2026-10-06

The previous source pin, `next@15.5.7`, predates published security fixes. This branch pins Next.js and `eslint-config-next` to `15.5.27`, the Maintenance LTS patch identified in the [September 30 security release](https://nextjs.org/blog/september-2026-security-release). React and React DOM remain pinned to `19.2.4`.

This is a source dependency repair, not evidence that production has received the patch. Require successful exact-head install, typecheck, tests, build, rendered route verification, governed deployment, and production identity readback before closing the production exposure. Applicability of individual advisories depends on enabled router and image/cache features; do not claim every listed vulnerability was exploitable here.

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
