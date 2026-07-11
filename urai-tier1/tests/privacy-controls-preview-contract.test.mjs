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

const page = read('src/app/privacy-controls/page.tsx')
const guide = read('src/app/UraiV2OnboardingLayer.tsx')

test('Privacy Controls is explicitly non-operational at source', () => {
  assert.match(page, /title: 'URAI Privacy Controls Preview'/)
  assert.match(page, /data-privacy-controls-state="non-operational-preview"/)
  assert.match(page, /This route is an explanatory, non-operational preview\./)
  assert.match(page, /Nothing on this page is a working privacy control\./)
  assert.match(page, /Preview only — no account setting changes here/)
  assert.match(page, /Examples describe intended behavior, not current enforcement/)
})

test('planned examples are not rendered as interactive controls', () => {
  assert.match(page, /Planned examples — not buttons/)
  assert.doesNotMatch(page, /<button\b/)
  assert.doesNotMatch(page, /<input\b/)
  assert.doesNotMatch(page, /<select\b/)
  assert.doesNotMatch(page, /<textarea\b/)
  assert.doesNotMatch(page, /onClick=/)
})

test('unproved privacy guarantees are absent from the preview', () => {
  for (const unsupported of [
    'Private by default',
    'No hidden raw-data sharing',
    'Export and deletion controls visible',
    'Human approval before real-world action',
    'consent stays visible, reversible, and human-led',
    'can only use approved context',
  ]) {
    assert.ok(!page.includes(unsupported), `unsupported guarantee remains: ${unsupported}`)
  }
})

test('privacy guide card also identifies the preview boundary', () => {
  assert.match(guide, /label: "CONSENT PREVIEW"/)
  assert.match(guide, /Review planned controls\. Nothing changes here\./)
  assert.match(guide, /href: "\/status"/)
  assert.match(guide, /action: "View production Status"/)
  assert.doesNotMatch(guide, /Permissions remain visible and reversible\./)
})

test('preview points users to production truth without duplicate rail links', () => {
  assert.match(page, /href="\/status"/)
  assert.match(page, /Use Status for current production-certification truth/)
  assert.match(page, /Operational controls require authenticated ownership/)

  const routeRail = page.match(/const routeRail = \[([\s\S]*?)\] as const/)
  assert.ok(routeRail, 'routeRail source block must be present')
  assert.doesNotMatch(routeRail[1], /['"]\/(?:status|passport)['"]/)

  const navigationRail = page.match(/<nav[\s\S]*?aria-label="URAI privacy preview route chain"[\s\S]*?<\/nav>/)
  assert.ok(navigationRail, 'privacy navigation rail must be present')
  assert.equal(navigationRail[0].match(/href="\/status"/g)?.length, 1, 'Status must render once in the navigation rail')
  assert.equal(navigationRail[0].match(/href="\/passport"/g)?.length, 1, 'Passport must render once in the navigation rail')
})
