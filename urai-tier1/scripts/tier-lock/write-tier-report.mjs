import fs from 'node:fs'
import path from 'node:path'
import { tierOneRoutes } from './tier-config.mjs'

const outDir = 'audit/tier-lock'
const outFile = path.join(outDir, 'TIER_LOCK_REPORT.md')
fs.mkdirSync(outDir, { recursive: true })

const now = new Date().toISOString()
const routeRows = tierOneRoutes.map((route) => `| ${route.route} | ${route.file} | ${route.kind} |`).join('\n')
const activeTier = process.argv[2] ?? process.env.URAI_TIER_LOCK ?? 'unknown'
const tierOrder = ['tier1', 'tier2', 'tier3', 'tier4', 'tier5']
const activeTierIndex = tierOrder.indexOf(activeTier)

function tierAtLeast(tier) {
  const requestedIndex = tierOrder.indexOf(tier)
  return activeTierIndex >= requestedIndex && requestedIndex !== -1
}

const localEvidenceRows = [
  ['Route audit', 'PASSED', 'Validated by tier runner before this report is written.'],
  ['Console warning audit', tierAtLeast('tier2') ? 'PASSED' : 'PENDING UNLESS RUN SEPARATELY', '`pnpm urai:tier2` and above run console warning audit.'],
  ['Tier-2 governance', tierAtLeast('tier2') ? 'PASSED' : 'PENDING UNLESS RUN SEPARATELY', '`pnpm tier2:check` / `pnpm urai:tier2`.'],
  ['Env readiness audit', tierAtLeast('tier4') ? 'PASSED' : 'PENDING UNLESS RUN SEPARATELY', '`pnpm urai:tier4` and above run env readiness audit.'],
  ['Typecheck', tierAtLeast('tier3') ? 'PASSED' : 'PENDING UNLESS RUN SEPARATELY', '`pnpm urai:tier3` and above run `pnpm run typecheck`.'],
  ['Unit tests', tierAtLeast('tier3') ? 'PASSED' : 'PENDING UNLESS RUN SEPARATELY', '`pnpm urai:tier3` and above run `pnpm run test:unit`.'],
  ['Build', tierAtLeast('tier4') ? 'PASSED' : 'PENDING UNLESS RUN SEPARATELY', '`pnpm urai:tier4` and above run `pnpm run build`.'],
  ['Playwright spatial E2E', 'NOT RUN BY THIS SCRIPT', '`pnpm verify:release` / `pnpm lock:e2e` must pass in CI or a browser-ready environment.'],
  ['Report generation', 'PASSED', `Generated ${outFile}.`],
]
  .map(([check, status, evidence]) => `| ${check} | ${status} | ${evidence} |`)
  .join('\n')

const body = `# URAI Spatial Tier Lock Report

Generated: ${now}

Active tier runner: ${activeTier}

## Tier Scope

- Tier 1: route lock, component presence, runtime authority, canon guardrails, and debug cleanup.
- Tier 2: route audit, console warning audit, governance checks, and visual route coverage hooks.
- Tier 3: Tier-2 gates plus typecheck, unit tests, and visual regression entrypoints.
- Tier 4: env readiness and deployment prerequisites.
- Tier 5: full scripted launch-lock chain: route audit, console audit, env readiness, typecheck, unit tests, build, and report generation.
- Full release verification: Tier-5 plus Playwright spatial E2E for camera/navigation/ESC behavior via \`pnpm verify:release\` / \`pnpm lock:e2e\`.

## Local Lock Evidence

| Check | Status | Evidence |
| --- | --- | --- |
${localEvidenceRows}

## Tier-1 Routes

| Route | File | Kind |
| --- | --- | --- |
${routeRows}

## Commands

\`\`\`bash
pnpm urai:tier1
pnpm urai:tier2
pnpm urai:tier3
pnpm urai:tier4
pnpm urai:tier5
pnpm verify:release
\`\`\`

## Current Local Lock Boundary

- Tier 2 can be marked locally locked only after \`pnpm urai:tier2\` prints \`tier2 passed\`.
- Tier 3 can be marked locally locked only after \`pnpm urai:tier3\` prints \`tier3 passed\`.
- Tier 4 can be marked locally locked only after \`pnpm urai:tier4\` prints \`tier4 passed\`.
- Scripted Tier 5 can be marked locally locked only after \`pnpm urai:tier5\` prints \`tier5 passed\`.
- Full release / browser lock remains pending until Playwright spatial E2E passes in a browser-ready environment or CI.

## Notes

- React DevTools messages are development-only.
- Cloud Workstations HMR websocket messages are tunnel/dev-environment warnings.
- ElevenLabs keys are optional if browser speech fallback remains enabled.
- This report records scripted local lock evidence; it does not replace CI/browser E2E evidence for full release verification.
`

fs.writeFileSync(outFile, body)
console.log(`[tier-report] wrote ${outFile}`)
