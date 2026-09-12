import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const read = (path) => readFile(new URL(`../urai-tier1/src/app/${path}/page.tsx`, import.meta.url), 'utf8')

test('legacy public entry paths converge on canonical owners', async () => {
  const expectations = new Map([
    ['signup', "redirect('/login?from=signup')"],
    ['onboarding', "redirect('/home?onboarding=1')"],
    ['settings/privacy', "redirect('/privacy-controls?from=settings-privacy')"],
    ['waitlist', "redirect('/status?from=waitlist')"],
    ['system', "redirect('/status?from=system')"],
  ])
  for (const [path, marker] of expectations) assert.ok((await read(path)).includes(marker), `${path} must redirect to its canonical owner`)
})

test('waitlist remains fail closed while durable intake is unavailable', async () => {
  const waitlist = await read('waitlist')
  assert.match(waitlist, /redirect\('\/status\?from=waitlist'\)/)
  assert.doesNotMatch(waitlist, /early-access|saveEarlyAccessSignup|localStorage/)
})

test('support remains explicit and fail-closed while delivery is unverified', async () => {
  const support = await read('support')
  assert.match(support, /Support intake is not open yet\./)
  assert.match(support, /intentionally fail-closed/)
  assert.match(support, /robots: \{ index: false, follow: false \}/)
  assert.doesNotMatch(support, /mailto:|support@urai\.app|<form/)
})
