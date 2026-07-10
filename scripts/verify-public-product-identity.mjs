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

requireTokens('urai-tier1/src/app/layout.tsx', [
  "metadataBase: new URL('https://urai.app')",
  "applicationName: 'URAI Spatial'",
  "siteName: 'URAI Spatial'",
  "card: 'summary'",
  "'urai-product-identity': 'product-not-legal-entity'",
])
requireTokens('urai-tier1/src/app/manifest.ts', [
  "name: 'URAI Spatial'",
  "short_name: 'URAI'",
  "start_url: '/home'",
  "src: '/icon.svg'",
])
requireTokens('urai-tier1/src/app/robots.ts', [
  "allow: '/'",
  "sitemap: 'https://urai.app/sitemap.xml'",
  "host: 'https://urai.app'",
])
requireTokens('urai-tier1/src/app/sitemap.ts', [
  "'/about'",
  "'/status'",
  "'/privacy-controls'",
  "new URL(route, 'https://urai.app')",
])
requireTokens('urai-tier1/public/icon.svg', [
  '<title id="title">URAI Spatial icon</title>',
  '<desc id="desc">A luminous cyan orb and orbit representing the URAI Spatial product.</desc>',
  'viewBox="0 0 512 512"',
])
for (const file of ['urai-tier1/public/humans.txt', 'urai-tier1/public/llms.txt']) {
  requireTokens(file, [
    'Canonical application: https://urai.app',
    'Canonical public repository: https://github.com/LifeLoggerAI/urai-spatial',
    'does not assert a legal entity, creator, founder, trademark owner, patent owner, copyright owner, or chain of title',
  ])
}

const productRecordText = read('urai-tier1/public/urai-product.json')
if (productRecordText) {
  try {
    const record = JSON.parse(productRecordText)
    if (record.schemaVersion !== 'urai-public-product-identity-1') failures.push('urai-product.json has an unexpected schemaVersion')
    if (record.productName !== 'URAI Spatial') failures.push('urai-product.json has an unexpected productName')
    if (record.canonicalApplication !== 'https://urai.app') failures.push('urai-product.json has an unexpected canonicalApplication')
    if (record.canonicalRepository !== 'https://github.com/LifeLoggerAI/urai-spatial') failures.push('urai-product.json has an unexpected canonicalRepository')
    if (record.identityScope !== 'product-not-legal-entity') failures.push('urai-product.json must remain product-not-legal-entity')
    if (!Array.isArray(record.withheldAssertions) || !record.withheldAssertions.includes('chain of title')) failures.push('urai-product.json must record withheld identity/ownership assertions')
  } catch (error) {
    failures.push(`urai-product.json is invalid JSON: ${error instanceof Error ? error.message : String(error)}`)
  }
}

if (failures.length) {
  console.error('Public product identity verification failed:')
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exit(1)
}

console.log('Public product identity verified: metadata, manifest, discovery files, icon, product record, and legal-identity boundaries passed')
