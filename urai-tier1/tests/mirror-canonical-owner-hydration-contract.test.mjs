import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

// Final exact-head trigger receipt: the assertions below are unchanged behavior gates.
const autoRealms = fs.readFileSync(new URL('../src/app/UraiAutonomousV1Realms.tsx', import.meta.url), 'utf8')
const mirrorClient = fs.readFileSync(new URL('../src/app/mirror/MirrorSpatialClient.tsx', import.meta.url), 'utf8')

test('canonical embodied Mirror suppresses the retired autonomous overlay owner', () => {
  assert.match(autoRealms, /if \(pathname\.startsWith\(\"\/mirror\"\)\) return null/)
  assert.doesNotMatch(autoRealms, /if \(pathname\.startsWith\(\"\/mirror\"\)\) return realms\.mirror/)
})

test('Mirror fixture state is hydration-safe and parsed only after mount', () => {
  assert.match(mirrorClient, /const \[fixture, setFixture\] = useState<string \| null>\(null\)/)
  assert.match(mirrorClient, /useEffect\(\(\) => \{\s*setFixture\(new URLSearchParams\(window\.location\.search\)\.get\('mirrorFixture'\)\)\s*\}, \[\]\)/)
  assert.doesNotMatch(mirrorClient, /typeof window === 'undefined' \? null : new URLSearchParams/)
})
