import fs from 'node:fs'
import path from 'node:path'
import { tierOneRoutes } from './tier-config.mjs'

const outDir = 'audit/tier-lock'
const outFile = path.join(outDir, 'TIER_LOCK_REPORT.md')
fs.mkdirSync(outDir, { recursive: true })

const now = new Date().toISOString()
const routeRows = tierOneRoutes.map((route) => `| ${route.route} | ${route.file} | ${route.kind} |`).join('\n')

const body = `# URAI Spatial Tier Lock Report\n\nGenerated: ${now}\n\n## Tier Commands\n\n- Tier 1: route lock, component presence, debug cleanup\n- Tier 2: console warning audit and visual route coverage hooks\n- Tier 3: typecheck, unit tests, and visual regression entrypoints\n- Tier 4: env readiness and deployment prerequisites\n- Tier 5: full launch-lock chain\n\n## Tier-1 Routes\n\n| Route | File | Kind |\n| --- | --- | --- |\n${routeRows}\n\n## Required Local Checks\n\n\`\`\`bash\npnpm urai:tier1\npnpm urai:tier2\npnpm urai:tier3\npnpm urai:tier4\npnpm urai:tier5\n\`\`\`\n\n## Notes\n\n- React DevTools messages are development-only.\n- Cloud Workstations HMR websocket messages are tunnel/dev-environment warnings.\n- ElevenLabs keys are optional if browser speech fallback remains enabled.\n`

fs.writeFileSync(outFile, body)
console.log(`[tier-report] wrote ${outFile}`)
