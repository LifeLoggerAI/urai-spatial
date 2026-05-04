# URAI Spatial Verification

## Commands

1. `pnpm -s test`
   - Functions build/tests: **PASS**
   - `urai-tier1` tests: **PASS**
   - E2E stage: **BLOCKED** by Playwright Chromium binary availability in this environment.

2. `pnpm -s test:e2e`
   - Dev server starts.
   - Fails at Playwright launch due missing browser executable.

3. `pnpm --filter urai-tier1 exec playwright install chromium`
   - Attempted browser install.
   - Fails with HTTP 403 from CDN in this environment.

4. `pnpm -s typecheck`
   - Last run initially failed due a corrupted line in `urai-tier1/src/spatial/scene/LifeMap.tsx`.
   - Corruption was removed in this branch.

## Notes
- E2E lock scripts are now wired correctly for monorepo resolution and dev startup.
- Remaining e2e blocker is environment/browser download access, not code-path wiring.
