#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs'

const failures = []

function read(path) {
  if (!existsSync(path)) {
    failures.push(`Missing public identity file: ${path}`)
    return ''
  }
  return readFileSync(path, 'utf8')
}

const requirements = [
  {
    path: 'urai-tier1/src/data/publicIdentity.ts',
    tokens: [
      "productName: 'URAI'",
      "runtimeName: 'URAI Spatial'",
      "canonicalUrl: 'https://urai.app'",
      "repositoryUrl: 'https://github.com/LifeLoggerAI/urai-spatial'",
      "name: 'Adam Clamp'",
      "role: 'Founder and creator of URAI'",
      'publicBoundary:',
      'publicIdentityJsonLd',
    ],
  },
  {
    path: 'urai-tier1/src/app/layout.tsx',
    tokens: [
      'metadataBase: new URL(publicIdentity.canonicalUrl)',
      'authors:',
      'creator: publicIdentity.creator.name',
      'publisher: publicIdentity.productName',
      'openGraph:',
      'twitter:',
      "'urai-deployed-sha': deployedSha",
      "'urai-production-authority': 'LifeLoggerAI/urai-spatial/urai-tier1/main'",
      'application/ld+json',
    ],
  },
  {
    path: 'urai-tier1/src/app/about/page.tsx',
    tokens: [
      'About URAI',
      'Current evidence boundary',
      'Canonical public references',
      'does not, by itself, prove authenticated personal-memory persistence',
      'publicIdentity.disambiguation',
    ],
  },
  { path: 'urai-tier1/src/app/sitemap.ts', tokens: ["'/about'", "'/status'", 'publicIdentity.canonicalUrl'] },
  { path: 'urai-tier1/src/app/robots.ts', tokens: ["disallow: ['/admin/', '/api/', '/internal/']", '/sitemap.xml'] },
  { path: 'urai-tier1/src/app/manifest.ts', tokens: ['publicIdentity.runtimeName', "display: 'standalone'", "src: '/icon.svg'"] },
  { path: 'urai-tier1/public/humans.txt', tokens: ['Creator: Adam Clamp', 'Production, provider, persistence, and physical-device claims remain evidence-gated.'] },
  { path: 'urai-tier1/public/llms.txt', tokens: ['Canonical source repository:', 'Do not infer authenticated personal-memory persistence', 'Creator: Adam Clamp'] },
  { path: 'urai-tier1/public/.well-known/urai-authority.json', tokens: ['"schemaVersion": "urai-public-authority-1"', '"productionRuntimeRoot": "urai-tier1"', '"required": true'] },
]

for (const requirement of requirements) {
  const source = read(requirement.path)
  for (const token of requirement.tokens) {
    if (!source.includes(token)) failures.push(`${requirement.path} missing identity marker: ${token}`)
  }
}

const authoritySource = read('urai-tier1/public/.well-known/urai-authority.json')
try {
  const authority = JSON.parse(authoritySource)
  if (authority.canonicalUrl !== 'https://urai.app') failures.push('Authority record canonicalUrl is incorrect')
  if (authority.canonicalRepository !== 'https://github.com/LifeLoggerAI/urai-spatial') failures.push('Authority record repository is incorrect')
  if (authority.productionBranch !== 'main') failures.push('Authority record production branch is incorrect')
} catch (error) {
  failures.push(`Authority record is invalid JSON: ${error instanceof Error ? error.message : String(error)}`)
}

const publicFiles = requirements.map((item) => item.path)
const prohibited = [
  /\bproduction[- ]certified\b/i,
  /\bfully live\b/i,
  /\bdevice[- ]certified\b/i,
  /\bactive provider\b/i,
  /\bowns all (?:IP|intellectual property)\b/i,
]
for (const path of publicFiles) {
  const source = read(path)
  for (const pattern of prohibited) {
    if (pattern.test(source) && !/not|pending|gated|does not|do not|without/i.test(source)) {
      failures.push(`${path} contains an unqualified public identity claim matching ${pattern}`)
    }
  }
}

const report = {
  ok: failures.length === 0,
  canonicalProduct: 'URAI',
  canonicalRuntime: 'URAI Spatial',
  canonicalRepository: 'LifeLoggerAI/urai-spatial',
  productionRuntimeRoot: 'urai-tier1/main',
  creatorLanguage: 'Adam Clamp — founder and creator of URAI',
  entityFormationClaimed: false,
  ownershipCertificationClaimed: false,
  failures,
}

console.log(JSON.stringify(report, null, 2))
if (failures.length) process.exitCode = 1
