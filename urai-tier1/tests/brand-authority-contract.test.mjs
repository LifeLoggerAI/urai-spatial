import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = (relativePath) => readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8')

const brand = read('src/lib/brand-authority.ts')
const layout = read('src/app/layout.tsx')
const about = read('src/app/about/page.tsx')
const sitemap = read('src/app/sitemap.ts')
const robots = read('src/app/robots.ts')
const manifest = read('src/app/manifest.ts')
const socialImage = read('src/app/opengraph-image.tsx')
const routeContract = read('src/lib/spatial-system-contract.ts')

test('canonical public identity names URAI Labs and Adam Clamp', () => {
  assert.match(brand, /URAI_BRAND_NAME = 'URAI Labs'/)
  assert.match(brand, /URAI_CREATOR_NAME = 'Adam Clamp'/)
  assert.match(brand, /URAI Labs, created by Adam Clamp/)
  assert.match(brand, /jobTitle: 'Creator of URAI'/)
  assert.doesNotMatch(brand, /founder:/i)
})

test('global metadata and structured data identify the canonical organization', () => {
  assert.match(layout, /metadataBase: new URL\(URAI_CANONICAL_URL\)/)
  assert.match(layout, /creator: URAI_CREATOR_NAME/)
  assert.match(layout, /publisher: URAI_BRAND_NAME/)
  assert.match(layout, /application\/ld\+json/)
  assert.match(layout, /uraiOrganizationSchema/)
  assert.match(layout, /uraiWebsiteSchema/)
})

test('about page directly disambiguates URAI Labs from unrelated entities', () => {
  assert.match(about, /URAI was created by Adam Clamp/)
  assert.match(about, /Not ARAI Labs or another “Urai”/)
  assert.match(about, /voice-agent companies/)
  assert.match(about, /industrial distributors/)
  assert.match(about, /neuroscience labs/)
  assert.match(about, /industrial blowers/)
  assert.match(about, /Created by Adam Clamp/)
})

test('crawler discovery surfaces expose the identity page', () => {
  assert.match(sitemap, /'\/about'/)
  assert.match(robots, /\/sitemap\.xml/)
  assert.match(manifest, /URAI Labs — URAI/)
  assert.match(routeContract, /about: "\/about"/)
})

test('social identity image names both URAI Labs and Adam Clamp', () => {
  assert.match(socialImage, /URAI LABS/)
  assert.match(socialImage, /URAI was created by Adam Clamp/)
  assert.match(socialImage, /URAI\.APP/)
})
