#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const authorityPath = 'docs/founder-readiness/PUBLIC_CLAIMS_AUTHORITY.md'
const publicRouteOwners = [
  'urai-tier1/src/app/page.tsx',
  'urai-tier1/src/app/home/page.tsx',
  'urai-tier1/src/app/ground/page.tsx',
  'urai-tier1/src/app/life-map/page.tsx',
  'urai-tier1/src/app/focus/page.tsx',
  'urai-tier1/src/app/replay/page.tsx',
  'urai-tier1/src/app/mirror/page.tsx',
  'urai-tier1/src/app/passport/page.tsx',
  'urai-tier1/src/app/privacy-controls/page.tsx',
  'urai-tier1/src/app/location-map/page.tsx',
  'urai-tier1/src/app/status/page.tsx',
  'urai-tier1/src/app/launch/page.tsx',
  'urai-tier1/src/app/early-access/page.tsx',
  'urai-tier1/src/app/terms/page.tsx',
  'urai-tier1/src/app/demo/page.tsx',
  'urai-tier1/src/app/demo/replay-film/page.tsx',
  'urai-tier1/src/app/spatial/ar-vr/page.tsx',
]
const optionalRouteOwners = ['urai-tier1/src/app/event/page.tsx']

const risks = [
  {
    id: 'legacy-brand',
    pattern: /\bURAI Genesis\b/i,
    allowed: /historical|legacy|deprecated|do not use|replace|avoid/i,
    reason: 'Current public routes must use URAI or URAI Spatial, not the legacy product name.',
  },
  {
    id: 'production-provider-device',
    pattern: /\b(production[- ]ready|production[- ]certified|fully live|launch[- ]ready|active providers?|provider[- ]active|device[- ]certified|Quest[- ]certified|WebXR[- ]certified)\b/i,
    allowed: /not|not yet|pending|gated|requires?|without|cannot|do not|does not|evidence|receipt|certification-pending|separately|matrix|status|boundary|preview/i,
    reason: 'Production, provider, and device claims require an immediate pending, evidence, preview, or boundary qualifier.',
  },
  {
    id: 'medical',
    pattern: /\b(diagnos(?:e|es|is|tic)|therapy replacement|medical device|treat(?:s|ment)?|clinical outcome|crisis intervention)\b/i,
    allowed: /not|non-diagnostic|do not|does not|avoid|without|never|prohibited|reflection|requires review/i,
    reason: 'Medical, diagnosis, treatment, therapy, and crisis language must be explicitly disclaimed.',
  },
  {
    id: 'surveillance-certainty',
    pattern: /\b(lie detection|mind reading|emotional certainty|psychological truth|always-on monitoring|surveillance)\b/i,
    allowed: /not|do not|does not|avoid|without|never|prohibited|disabled|consent/i,
    reason: 'Surveillance and certainty claims must be explicitly prohibited or disclaimed.',
  },
  {
    id: 'autonomous-action',
    pattern: /\b(autonomous(?: real-world)? actions?|acts autonomously|takes action for you|executes actions for you)\b/i,
    allowed: /not|does not|do not|human-approved|approval|consent|disabled|future|gated/i,
    reason: 'Autonomous-action language must remain human-approved, disabled, future, or explicitly disclaimed.',
  },
  {
    id: 'persistent-memory',
    pattern: /\b(remembers your life|persistent personal memory|persistent private memory|live private memory|user memory sync|authenticated persistence)\b/i,
    allowed: /designed|not proven|not live|pending|gated|sample|demo|user-controlled|permission|future|without|does not|separately|requires/i,
    reason: 'Persistent or authenticated personal-memory language requires a design, sample, pending, or evidence-gated qualifier.',
  },
  {
    id: 'financing-guarantee',
    pattern: /\b(guaranteed (?:investment )?returns?|guaranteed market size|guaranteed valuation|guaranteed commercial outcome|risk-free investment)\b/i,
    allowed: /not|never|prohibited|do not|without counsel/i,
    reason: 'Financing, return, valuation, and market guarantees are prohibited without appropriate review and evidence.',
  },
  {
    id: 'unverified-ownership',
    pattern: /\b(owns extensive IP|all intellectual property is owned|guaranteed patent coverage|fully patented|patent-protected worldwide)\b/i,
    allowed: /not|pending|requires counsel|subject to|do not|unverified/i,
    reason: 'Entity, IP, patent, and ownership claims require authorized records and counsel review.',
  },
]

const passingFixtures = [
  'Production certification remains pending until exact receipts exist.',
  'Active providers remain separately gated.',
  'WebXR is a preview and not device-certified.',
  'Mirror is reflection, not diagnosis or treatment.',
  'URAI must not be described as surveillance or emotional certainty.',
  'Autonomous real-world actions remain disabled and require human approval.',
  'The demo does not prove persistent private memory or authenticated persistence.',
  'Guaranteed investment returns are prohibited.',
  'Ownership language requires counsel review.',
]
const failingFixtures = [
  'URAI Genesis is the current public product.',
  'URAI is production ready.',
  'URAI has active providers.',
  'URAI is Quest-certified.',
  'Mirror diagnoses your emotional state.',
  'URAI provides lie detection and emotional certainty.',
  'URAI takes autonomous actions for you.',
  'URAI remembers your life with persistent private memory.',
  'This is a risk-free investment with guaranteed returns.',
  'URAI owns extensive IP and is fully patented.',
]

function read(relative) {
  return fs.readFileSync(path.join(root, relative), 'utf8')
}

function publicTextFromLine(line) {
  const fragments = []
  for (const match of line.matchAll(/>([^<>{}][^<>]*)</g)) fragments.push(match[1])
  for (const match of line.matchAll(/(?:aria-label|title|description|content|placeholder|alt)=['"]([^'"]+)['"]/g)) fragments.push(match[1])
  for (const match of line.matchAll(/(?:title|description|summary|body|label|eyebrow|placeholder|alt|ariaLabel)\s*:\s*['"`]([^'"`]+)['"`]/g)) fragments.push(match[1])
  return fragments.join(' ')
}

function findRisk(text) {
  return risks.find((risk) => risk.pattern.test(text) && !risk.allowed.test(text))
}

for (const fixture of passingFixtures) {
  const risk = findRisk(fixture)
  if (risk) {
    console.error(`public-claims: passing fixture failed (${risk.id}): ${fixture}`)
    process.exit(1)
  }
}
for (const fixture of failingFixtures) {
  if (!findRisk(fixture)) {
    console.error(`public-claims: failing fixture passed unexpectedly: ${fixture}`)
    process.exit(1)
  }
}

if (!fs.existsSync(path.join(root, authorityPath))) {
  console.error(`public-claims: missing authority file: ${authorityPath}`)
  process.exit(1)
}
const authority = read(authorityPath)
for (const required of [
  '## Approval roles',
  '## Allowed current public status',
  '## Required demo disclosure',
  '## Required investor-demo disclosure',
  '## Prohibited without new evidence and review',
  '## Change-control rule',
  'Founder / claims owner assigned through issue `#497`',
  'Release-control owner assigned through issue `#461`',
  'Demo-kit owner assigned through issue `#495`',
  'Pending named-role acknowledgment',
]) {
  if (!authority.includes(required)) {
    console.error(`public-claims: authority file is missing: ${required}`)
    process.exit(1)
  }
}

let failed = false
const existingOptional = optionalRouteOwners.filter((relative) => fs.existsSync(path.join(root, relative)))
for (const relative of [...publicRouteOwners, ...existingOptional]) {
  const absolute = path.join(root, relative)
  if (!fs.existsSync(absolute)) {
    console.error(`public-claims: required public route owner is missing: ${relative}`)
    failed = true
    continue
  }
  const lines = read(relative).split(/\r?\n/)
  lines.forEach((line, index) => {
    const text = publicTextFromLine(line)
    if (!text) return
    const context = [publicTextFromLine(lines[index - 1] || ''), text, publicTextFromLine(lines[index + 1] || '')].join(' ')
    const risk = risks.find((candidate) => candidate.pattern.test(text) && !candidate.allowed.test(context))
    if (!risk) return
    console.error(`public-claims: risky claim in ${relative}:${index + 1}`)
    console.error(`  policy: ${risk.id}`)
    console.error(`  ${risk.reason}`)
    console.error(`  ${line.trim()}`)
    failed = true
  })
}

if (failed) process.exit(1)
console.log(`public-claims: authority and ${publicRouteOwners.length + existingOptional.length} public route owners passed`)
