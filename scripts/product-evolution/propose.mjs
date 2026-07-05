#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const outDir = path.join(root, 'audit', 'v8')
const gapsPath = path.join(outDir, 'product-gaps.json')

if (!fs.existsSync(gapsPath)) {
  console.error('[v8-propose] missing product gaps. Run node scripts/product-evolution/detect-gaps.mjs first.')
  process.exit(1)
}

const gaps = JSON.parse(fs.readFileSync(gapsPath, 'utf8')).gaps || []
const lines = [
  '# V8 Product Evolution Proposals',
  '',
  `Generated: ${new Date().toISOString()}`,
  '',
  '## Safety rule',
  '',
  'V8 proposes changes only. It does not auto-merge, auto-deploy, or rewrite V1-V6 runtime surfaces without review.',
  '',
  '## Proposals',
  '',
]

if (gaps.length === 0) {
  lines.push('- No structural product evolution gaps detected. Keep collecting evidence and wait for asset activation results.')
} else {
  for (const gap of gaps) lines.push(`- **${gap.id}** (${gap.severity}): ${gap.recommendation}`)
}

fs.writeFileSync(path.join(outDir, 'product-evolution-proposals.md'), lines.join('\n') + '\n')
console.log(lines.join('\n'))
