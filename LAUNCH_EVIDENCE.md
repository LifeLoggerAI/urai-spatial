# URAI Launch Evidence

Date: 2026-06-23
Repository: LifeLoggerAI/urai-spatial
Canonical app: urai-tier1

## Commits from this execution

- f68524381f76a78f9ade6091a83a6ab91d822f63
- 6cc264743135fdfc5e02ef3e99691472c48bfefa

## Source inspection

The canonical public app is `urai-tier1`.

Primary routes inspected in source:

- `/`
- `/home`
- `/ground`
- `/life-map`
- `/focus`
- `/replay`
- `/mirror`
- `/passport`
- `/status`

## Source updates

- Added Home World control panels for orb and user route actions.
- Added Home World route links into Life Map, Ground, Mirror, and Passport.
- Added a reusable Home World launch CSS module.

## Public checks

`https://urai.app/` loaded.

Linked route checks loaded from the public home surface:

- `/life-map`
- `/focus`
- `/replay`
- `/mirror`
- `/passport`
- `/status`

## Not completed in this execution

- Local command checks could not run because shell network access returned `000` for public route curls.
- Direct browser opens for `/home` and `/ground` were not accepted by the browser tool unless reached from a discovered link.
- Deploy was not run because deploy environment variables were not available.

## Remaining work

- Run local typecheck, build, and route smoke checks in a networked repo checkout.
- Deploy main after checks pass.
- Capture screenshots after deploy.
