import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { validateHostingHeaders, checkFiles } from '../scripts/check-hosting-response-headers.mjs'

const baseline = () => ({
  hosting: {
    headers: [{ source: '**', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'no-referrer' },
      { key: 'Content-Security-Policy', value: "base-uri 'self'; object-src 'none'; frame-ancestors 'self'" },
    ] }],
  },
})
const validate = (config) => validateHostingHeaders(config, 'fixture.json')

test('baseline global headers are admitted', () => assert.deepEqual(validate(baseline()), []))
test('missing Hosting config fails', () => assert.match(validate({})[0], /missing Hosting/))
test('missing global rule fails', () => { const c=baseline(); c.hosting.headers=[]; assert.match(validate(c).join(' '), /exactly one/) })
test('missing CSP fails', () => { const c=baseline(); c.hosting.headers[0].headers.pop(); assert.match(validate(c).join(' '), /content-security-policy/) })
test('missing nosniff fails', () => { const c=baseline(); c.hosting.headers[0].headers.shift(); assert.match(validate(c).join(' '), /x-content-type-options/) })
test('missing referrer protection fails', () => { const c=baseline(); c.hosting.headers[0].headers.splice(1,1); assert.match(validate(c).join(' '), /referrer-policy/) })
test('weakened CSP fails', () => { const c=baseline(); c.hosting.headers[0].headers[2].value="base-uri 'self'"; assert.match(validate(c).join(' '), /content-security-policy/) })
test('duplicate global header fails', () => { const c=baseline(); c.hosting.headers[0].headers.push({key:'content-security-policy',value:"base-uri 'self'; object-src 'none'; frame-ancestors 'self'"}); assert.match(validate(c).join(' '), /duplicate/) })
test('accidental script-src requires separate compatibility review', () => { const c=baseline(); c.hosting.headers[0].headers[2].value += "; script-src 'self'"; assert.match(validate(c).join(' '), /script enforcement/) })
test('both checked-in Hosting configurations pass', () => assert.deepEqual(checkFiles(['firebase.json','firebase.static.json']), []))
test('preserve existing static cache directives', () => {
  const c=JSON.parse(readFileSync('firebase.static.json','utf8'))
  assert.ok(c.hosting.headers.some(rule=>rule.source==='**/*.html' && rule.headers.some(header=>header.key==='Cache-Control')))
  assert.ok(c.hosting.headers.some(rule=>rule.source==='/release-fingerprint.json' && rule.headers.some(header=>header.key==='Cache-Control')))
})
test('preserve API rewrites in both configurations', () => {
  for (const path of ['firebase.json','firebase.static.json']) {
    const c=JSON.parse(readFileSync(path,'utf8'))
    assert.ok(c.hosting.rewrites.some(rewrite=>rewrite.source==='/api/google/oauth/start'),path)
  }
})
