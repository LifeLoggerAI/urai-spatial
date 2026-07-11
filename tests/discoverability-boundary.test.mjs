import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()

const read = (relativePath) => {
  const absolute = path.join(root, relativePath)
  assert.ok(fs.existsSync(absolute), `missing expected file: ${relativePath}`)
  return fs.readFileSync(absolute, 'utf8')
}

const boundary = read('urai-tier1/src/lib/discoverability-boundary.ts')
const layout = read('urai-tier1/src/app/layout.tsx')
const robots = read('urai-tier1/src/app/robots.ts')
const sitemap = read('urai-tier1/src/app/sitemap.ts')

const publicRouteLiteralPattern = /['"]\/(?:home|ground|life-map|focus|replay|mirror|passport|status|privacy-controls)['"]/
const unapprovedMetadataKeyPatterns = [
  /['"]?openGraph['"]?\s*:/,
  /['"]?twitter['"]?\s*:/,
  /['"]?alternates['"]?\s*:/,
  /['"]?manifest['"]?\s*:/,
]

test('discoverability authority is fail closed and tied to urai.app', () => {
  assert.match(boundary, /URAI_PUBLIC_ORIGIN\s*=\s*['"]https:\/\/urai\.app['"]/) 
  assert.match(boundary, /URAI_INDEXING_STATE\s*=\s*['"]blocked-pending-production-proof['"]/) 
  assert.match(boundary, /URAI_INDEXING_ENABLED\s*=\s*false/)
  assert.match(boundary, /URAI_APPROVED_SITEMAP_ROUTES\s*=\s*Object\.freeze\(\[\]\s*as\s*string\[\]\)/)
  assert.match(boundary, /pwaClaimApproved\s*:\s*false/)
  assert.match(boundary, /multilingualMetadataApproved\s*:\s*false/)
  assert.match(boundary, /socialCardClaimApproved\s*:\s*false/)
})

test('root metadata blocks indexing and exposes the boundary', () => {
  assert.match(layout, /metadataBase\s*:\s*new URL\(URAI_PUBLIC_ORIGIN\)/)
  assert.match(layout, /robots\s*:\s*\{[\s\S]*index\s*:\s*false,[\s\S]*follow\s*:\s*false,[\s\S]*nocache\s*:\s*true/)
  assert.match(layout, /googleBot\s*:\s*\{[\s\S]*index\s*:\s*false,[\s\S]*follow\s*:\s*false,[\s\S]*noimageindex\s*:\s*true/)
  assert.match(layout, /['"]urai-indexing-state['"]\s*:\s*URAI_INDEXING_STATE/)
  assert.match(layout, /data-indexing-state=\{URAI_INDEXING_STATE\}/)
})

test('robots disallows all crawlers while indexing is blocked', () => {
  assert.match(robots, /if\s*\(URAI_INDEXING_ENABLED\)/)
  assert.match(robots, /throw\s+new\s+Error\(\s*['"]Public indexing requires a reviewed release change and exact production evidence\.['"]\s*\)/)
  assert.match(robots, /userAgent\s*:\s*['"]\*['"]/) 
  assert.match(robots, /disallow\s*:\s*['"]\/['"]/) 
  assert.match(robots, /host\s*:\s*URAI_PUBLIC_ORIGIN/)
  assert.doesNotMatch(robots, /\ballow\s*:/)
})

test('sitemap remains empty until approved routes exist', () => {
  assert.match(sitemap, /if\s*\(!URAI_INDEXING_ENABLED\)\s*return\s*\[\]/)
  assert.match(sitemap, /URAI_APPROVED_SITEMAP_ROUTES\.map/)
  assert.doesNotMatch(boundary, publicRouteLiteralPattern)
})

test('security patterns detect quote and spacing variants', () => {
  for (const fixture of ["'/home'", '"/home"']) {
    assert.match(fixture, publicRouteLiteralPattern)
  }

  const metadataFixtures = [
    'openGraph:',
    '"twitter" :',
    "'alternates':",
    'manifest\t:',
  ]
  for (const [index, fixture] of metadataFixtures.entries()) {
    assert.match(fixture, unapprovedMetadataKeyPatterns[index])
  }
})

test('unapproved installability, social, and locale metadata remain absent', () => {
  for (const pattern of unapprovedMetadataKeyPatterns) {
    assert.ok(!pattern.test(layout), `root metadata must not include unapproved token: ${pattern.source}`)
  }
  assert.equal(fs.existsSync(path.join(root, 'urai-tier1/src/app/manifest.ts')), false)
  assert.equal(fs.existsSync(path.join(root, 'urai-tier1/src/app/manifest.webmanifest')), false)
})
