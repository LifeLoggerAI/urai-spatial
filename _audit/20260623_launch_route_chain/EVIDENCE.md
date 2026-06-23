# URAI Spatial launch route chain evidence

Date: 2026-06-23

## Scope

Primary route chain:

- `/`
- `/home`
- `/ground`
- `/life-map`
- `/focus`
- `/replay`
- `/mirror`
- `/passport`
- `/status`

## Source inspection

- `urai-tier1/src/app/page.tsx` and `urai-tier1/src/app/home/page.tsx` both render `TierOneExperience mode="home"`.
- `urai-tier1/src/spatial/layout/HomeWorldProduction.tsx` includes sky ascent to `/life-map`, ground entry to `/ground`, orb/companion copy, council/workforce hint, Mirror, Passport, and Life Map links.
- `urai-tier1/src/app/ground/page.tsx` is an embodied Ground World page with private workforce/council cards, inspectable life objects, and route-chain continuation.

## Live public verification

Checked current deployed public routes from the web fetch layer.

| Route | Public result | Notes |
| --- | --- | --- |
| `/` | resolved | Home World text present. |
| `/home` | resolved | Loading/fallback shell text present. |
| `/ground` | not resolved by public fetch | Source exists in repo, but live deploy has not exposed it yet. |
| `/life-map` | resolved | Life Map route text present. |
| `/focus` | resolved | Focus chamber fallback text present. |
| `/replay` | resolved | Replay route fallback text present. |
| `/mirror` | resolved | Mirror reflection route text present. |
| `/passport` | resolved | Passport ownership route text present. |
| `/status` | resolved | Status/proof route text present. |

## Repo-native verification workflow

Added `.github/workflows/launch-verification.yml`.

The workflow runs on `workflow_dispatch` and launch-route source changes. It installs pnpm, runs typecheck, runs the production build, starts the local Spatial server on port 3001, checks `/`, `/home`, `/ground`, `/life-map`, `/focus`, `/replay`, `/mirror`, `/passport`, and `/status`, and uploads route evidence/logs as a GitHub Actions artifact.

Workflow commit: `4d28b986ea5eefedf90916c5dca2f49a4006a2e5`.

## Push-trigger attempt

A push-trigger evidence update was committed from the repo connector to start the launch verification workflow through its configured push paths.

Trigger commit requested: 2026-06-23 UTC.

## Local commands still required when Cloud Shell is available

```bash
cd ~/urai-spatial
pnpm install --no-frozen-lockfile
pnpm typecheck || true
pnpm test || true
pnpm build
for route in / /home /ground /life-map /focus /replay /mirror /passport /status; do
  curl -I "http://127.0.0.1:3000$route" || true
done
```

## Deploy command to run after local build passes

```bash
cd ~/urai-spatial
pnpm run live:deploy
```

## Blockers

- Public `/ground` was not visible from `https://urai.app/ground` during web verification.
- Deploy was not attempted from this runtime because Firebase credentials/project environment and repository workspace are unavailable here.
- Commit status lookup for the workflow commit returned no status contexts yet, so this evidence does not claim that the workflow completed.

## Next command

```bash
cd ~/urai-spatial && pnpm build && pnpm run live:deploy
```
