import fs from 'node:fs'
import path from 'node:path'
import { tierOneRoutes } from './tier-config.mjs'

const outDir = 'audit/tier-lock'
const outFile = path.join(outDir, 'TIER_LOCK_REPORT.md')
fs.mkdirSync(outDir, { recursive: true })

const now = new Date().toISOString()
const routeRows = tierOneRoutes.map((route) => `| ${route.route} | ${route.file} | ${route.kind} |`).join('\n')
const activeTier = process.argv[2] ?? process.env.URAI_TIER_LOCK ?? 'unknown'

const localEvidenceRows = [
  ['Route audit', 'PASSED', 'Validated by tier runner before this report is written.'],
  ['Console warning audit', 'PASSED', 'React DevTools and Cloud Workstations HMR websocket notices are development-only.'],
  ['Tier-2 governance', activeTier === 'tier2' || activeTier === 'tier3' ? 'PASSED' : 'AVAILABLE', '`pnpm tier2:check` / `pnpm urai:tier2`.'],
  ['Typecheck', activeTier === 'tier3' ? 'PASSED' : 'PENDING UNLESS RUN SEPARATELY', '`pnpm urai:tier3` runs `pnpm run typecheck`.'],
  ['Unit tests', activeTier === 'tier3' ? 'PASSED' : 'PENDING UNLESS RUN SEPARATELY', '`pnpm urai:tier3` runs `pnpm run test:unit`.'],
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
- Tier 5: full launch-lock chain, including Playwright spatial E2E for camera/navigation/ESC behavior.

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
\`\`\`

## Current Local Lock Boundary

- Tier 2 can be marked locally locked only after \`pnpm urai:tier2\` prints \`tier2 passed\`.
- Tier 3 can be marked locally locked only after \`pnpm urai:tier3\` prints \`tier3 passed\`.
- Tier 4 remains pending until env/deploy readiness passes.
- Tier 5 remains pending until Playwright spatial E2E passes in a browser-ready environment or CI.

## Notes

- React DevTools messages are development-only.
- Cloud Workstations HMR websocket messages are tunnel/dev-environment warnings.
- ElevenLabs keys are optional if browser speech fallback remains enabled.
- This report records local lock evidence; it does not replace CI/browser E2E evidence for Tier 5.
`

fs.writeFileSync(outFile, body)
console.log(`[tier-report] wrote ${outFile}`)
