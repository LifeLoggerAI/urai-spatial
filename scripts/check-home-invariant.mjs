#!/usr/bin/env node
import fs from 'node:fs'

const homeFiles = [
  'src/app/page.tsx',
  'urai-tier1/src/app/page.tsx',
].filter((file) => fs.existsSync(file))

const forbiddenPatterns = [
  /<button\b/i,
  /href\s*=/i,
  /onboarding/i,
  /narrat(?:or|ion|e)/i,
  /upgrade/i,
  /sign\s*in/i,
  /log\s*in/i,
  /loading\s+urai\s+spatial/i,
  />\s*[^<{][^<>{}]{2,}\s*</,
]

for (const file of homeFiles) {
  const text = fs.readFileSync(file, 'utf8')
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(text)) {
      console.error(`Tier-1 home invariant violation in ${file}: ${pattern}`)
      process.exit(1)
    }
  }
}

console.log(`Tier-1 home invariant passed for ${homeFiles.join(', ')}`)
