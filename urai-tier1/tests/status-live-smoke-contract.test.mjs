import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const smoke = fs.readFileSync(new URL('../../scripts/urai-post-deploy-smoke.mjs', import.meta.url), 'utf8')

test('protected post-deploy Status smoke matches the fingerprint-gated server shell', () => {
  assert.match(smoke, /'\/status'/)
  assert.match(smoke, /'Launch locked\. Proof before expansion\.'/)
  assert.match(smoke, /'fingerprint-gated'/)
  assert.match(smoke, /'Production certification remains hidden until the protected fingerprint is validated\.'/)
  assert.match(smoke, /\['Pending proof', 'World online\. Route matrix visible\.'\]/)
  assert.doesNotMatch(smoke, /'Pending proof'\], \['World online\. Route matrix visible\.'/)
})
