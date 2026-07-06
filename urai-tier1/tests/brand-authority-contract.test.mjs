import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const brand = read('src/lib/brand-authority.ts')
const layout = read('src/app/layout.tsx')
const about = read('src/app/about/page.tsx')
const sitemap = read('src/app/sitemap.ts')
const robots = read('src/app/robots.ts')
const socialImage = read('src/app/opengraph-image.tsx')
const llms = read('public/llms.txt')
const humans = read('public/humans.txt')
const identity = JSON.parse(read('public/.well-known/urai-labs.json'))

const includesAll = (source, values) => {
  for (const value of values) assert.ok(source.includes(value), `missing ${value}`)
}

test('canonical identity names URAI Labs and Adam Clamp', () => {
  includesAll(brand, ['URAI Labs', 'Adam Clamp', 'Creator of URAI', 'https://urai.app'])
})

test('global metadata contains organization and website authority', () => {
  includesAll(layout, [
    'metadataBase',
    'creator: URAI_CREATOR_NAME',
    'publisher: URAI_BRAND_NAME',
    'application/ld+json',
    'uraiOrganizationSchema',
    'uraiWebsiteSchema',
  ])
})

test('official about page disambiguates the brand', () => {
  includesAll(about, [
    'URAI was created by Adam Clamp',
    'Not ARAI Labs',
    'neuroscience labs',
    'industrial blowers',
  ])
})

test('crawler and social surfaces expose the same identity', () => {
  includesAll(sitemap, ["'/about'"])
  includesAll(robots, ['/sitemap.xml'])
  includesAll(socialImage, ['URAI LABS', 'Adam Clamp', 'URAI.APP'])
  includesAll(llms, ['URAI Labs', 'Adam Clamp', 'ARAI Labs'])
  includesAll(humans, ['URAI Labs', 'Adam Clamp', 'ARAI Labs'])
})

test('machine identity record is internally consistent', () => {
  assert.equal(identity.organization.name, 'URAI Labs')
  assert.equal(identity.product.name, 'URAI')
  assert.equal(identity.creator.name, 'Adam Clamp')
  assert.equal(identity.creator.relationship, 'Creator of URAI')
  assert.equal(identity.organization.canonicalUrl, 'https://urai.app')
})
