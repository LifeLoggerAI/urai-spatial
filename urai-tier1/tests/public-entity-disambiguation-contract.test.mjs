import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8')

test('public identity authority explicitly disambiguates unrelated Urai and URAI entities', () => {
  const identity = read('src/app/identity/page.tsx')
  const entity = JSON.parse(read('public/urai-entity.json'))
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
})
