#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const failures = []
const read = (relative) => {
  const absolute = path.join(root, relative)
  if (!fs.existsSync(absolute)) {
    failures.push(`${relative} is missing`)
    return ''
  }
  return fs.readFileSync(absolute, 'utf8')
}
const requireTokens = (relative, tokens) => {
  const text = read(relative)
  for (const token of tokens) if (!text.includes(token)) failures.push(`${relative} is missing: ${token}`)
  return text
}

const about = requireTokens('urai-tier1/src/app/about/page.tsx', [
  "title: 'About URAI Spatial'",
  "canonical: 'https://urai.app/about'",
  "'@type': 'SoftwareApplication'",
  "codeRepository: 'https://github.com/LifeLoggerAI/urai-spatial'",
  'data-identity-scope="product-not-legal-entity"',
  'It does not assert a legal entity, creator, founder, trademark owner, patent owner, copyright owner, or chain of title.',
  'Production certification, authenticated persistence, active providers, and physical-device certification remain separately receipt-gated.',
])
for (const forbidden of [
  /['"]@type['"]:\s*['"]Organization['"]/,
  /['"]@type['"]:\s*['"]Person['"]/,
  /founderName/i,
  /creatorName/i,
  /owns extensive IP/i,
  /fully patented/i,
]) {
  if (forbidden.test(about)) failures.push(`about page contains unapproved identity or ownership assertion: ${forbidden}`)
}

requireTokens('urai-tier1/src/app/manifest.ts', [
  "name: 'URAI Spatial'",
  "short_name: 'URAI'",
  "start_url: '/home'",
  "src: '/icon.svg'",
])
for (const file of ['urai-tier1/public/humans.txt', 'urai-tier1/public/llms.txt']) {
  requireTokens(file, [
    'Canonical application: https://urai.app',
    'Canonical public repository: https://github.com/LifeLoggerAI/urai-spatial',
    'does not assert a legal entity, creator, founder, trademark owner, patent owner, copyright owner, or chain of title',
  ])
}

if (failures.length) {
  console.error('Public product identity verification failed:')
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exit(1)
}

console.log('Public product identity verified: product/repository facts present; legal identity and ownership claims withheld')
