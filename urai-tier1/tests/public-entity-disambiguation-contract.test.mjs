import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8')

test('public identity authority explicitly disambiguates unrelated Urai and URAI entities', () => {
  const identity = read('src/app/identity/page.tsx')
  const founder = read('src/app/founder/page.tsx')
  const about = read('src/app/about/page.tsx')
  const ecosystem = read('src/app/ecosystem/page.tsx')
  const press = read('src/app/press/page.tsx')
  const entity = JSON.parse(read('public/urai-entity.json'))
  const claims = JSON.parse(read('public/urai-public-claims.json'))
  const llms = read('public/llms.txt')
  const sitemap = read('src/app/sitemap.ts')
  const routes = JSON.parse(read('../release/route-manifest.json'))

  assert.match(identity, /Urai AI Corp\./)
  assert.match(identity, /Inturai Ventures Corp\./)
  assert.match(identity, /Perfect10 AI/)
  assert.match(identity, /not affiliated/i)
  assert.match(identity, /robots: publicIndexing/)
  assert.match(identity, /canonical: 'https:\/\/urai\.app\/identity\/'/)
  assert.match(identity, /application\/ld\+json/)
  assert.equal(entity.disambiguation.canonicalIdentityPage, 'https://urai.app/identity/')
  assert.equal(entity.disambiguation.notAffiliatedWith.length, 3)
  assert.ok(entity.disambiguation.notAffiliatedWith.every((entry) => entry.relationship === 'none'))
  assert.match(llms, /Official identity and disambiguation: https:\/\/urai\.app\/identity\//)
  assert.match(llms, /Urai AI Corp\./)
  assert.match(sitemap, /'\/identity'/)
  assert.ok(routes.classification.publicExact.includes('/identity'))

  const canonicalFounderRole = 'Founder, Steward and System Architect'
  assert.equal(entity.entities.founder.role, canonicalFounderRole)
  for (const source of [identity, founder, about, press, llms, JSON.stringify(claims)]) {
    assert.match(source, /Founder, Steward and System Architect/)
    assert.doesNotMatch(source, /founder and system architect/i)
  }

  assert.equal(entity.entities.foundation.jurisdiction, 'Texas')
  assert.equal(entity.entities.foundation.entityType, 'Domestic Nonprofit Corporation')
  assert.equal(entity.entities.foundation.filingNumber, '806421687')
  assert.equal(entity.entities.foundation.originalFilingDate, '2026-02-02')
  assert.equal(entity.entities.foundation.status, 'involuntarily-terminated')
  assert.equal(entity.entities.foundation.terminationEffectiveDate, '2026-04-28')
  const stateClaim = claims.claims.find((claim) => claim.id === 'foundation-state-record')
  assert.ok(stateClaim)
  assert.match(stateClaim.claim, /806421687/)
  assert.match(stateClaim.claim, /involuntarily terminated/i)
  const activeClaim = claims.claims.find((claim) => claim.id === 'foundation-active-legal')
  assert.equal(activeClaim?.status, 'unsupported-do-not-publish')
  for (const source of [about, ecosystem, press, llms, JSON.stringify(entity), JSON.stringify(claims)]) {
    assert.match(source, /involuntarily terminated/i)
    assert.doesNotMatch(source, /formation-stage public-interest standards and governance initiative/i)
  }
})
