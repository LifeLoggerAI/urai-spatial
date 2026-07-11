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

const stripComments = (source) => source
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '')

const guide = read('src/app/UraiV2OnboardingLayer.tsx')
const executableGuide = stripComments(guide)
const styles = read('src/app/v2-onboarding.css')

const forbiddenExecutablePatterns = [
  ['localStorage access', /\blocalStorage\s*(?:\.|\[)/],
  ['sessionStorage access', /\bsessionStorage\s*(?:\.|\[)/],
  ['cookie access', /\bdocument\s*\.\s*cookie\b/],
  ['fetch call', /(?:^|[^\w])fetch\s*\(/m],
  ['Axios import or call', /(?:from\s+['"][^'"]*axios[^'"]*['"]|\baxios\s*\.)/],
  ['Firebase import', /from\s+['"][^'"]*firebase[^'"]*['"]/],
  ['Firestore setDoc call', /\bsetDoc\s*\(/],
  ['Firestore addDoc call', /\baddDoc\s*\(/],
]

test('query-triggered cards identify themselves as an optional guided demo', () => {
  assert.match(guide, /function GuidedDemoCardContent\(\)/)
  assert.match(guide, /data-guide-state="optional-guided-demo"/)
  assert.match(guide, /data-guide-trigger="query-only"/)
  assert.match(guide, /data-guide-persistence="none"/)
  assert.match(guide, /optional guided demo/)
  assert.match(guide, /OPTIONAL GUIDED DEMO/)
  assert.doesNotMatch(guide, /first-run guide/)
  assert.doesNotMatch(guide, /optional guided preview/)
})

test('guide is only shown through explicit query parameters', () => {
  assert.match(guide, /searchParams\?\.get\("onboarding"\) === "1"/)
  assert.match(guide, /searchParams\?\.get\("firstRun"\) === "1"/)
  assert.match(guide, /const shouldShowGuide = guideTrigger !== null/)
  assert.match(guide, /if \(dismissed \|\| !shouldShowGuide \|\| !card\) return null/)
})

test('explicit guide trigger continues across route actions without storing completion', () => {
  assert.match(guide, /type GuideTrigger = "onboarding=1" \| "firstRun=1"/)
  assert.match(guide, /const appendGuideTrigger = \(href: string, trigger: GuideTrigger\)/)
  assert.match(guide, /href\.includes\("\?"\) \? "&" : "\?"/)
  assert.match(guide, /const guideHref = card && guideTrigger \? appendGuideTrigger\(card\.href, guideTrigger\)/)
  assert.match(guide, /<a href=\{guideHref\}>\{card\.action\}<\/a>/)

  const appendGuideTrigger = (href, trigger) => `${href}${href.includes('?') ? '&' : '?'}${trigger}`
  assert.equal(appendGuideTrigger('/ground', 'onboarding=1'), '/ground?onboarding=1')
  assert.equal(
    appendGuideTrigger('/focus?memoryId=quiet-reset', 'firstRun=1'),
    '/focus?memoryId=quiet-reset&firstRun=1',
  )
})

test('dismissal resets only for route or visibility-trigger changes', () => {
  assert.match(guide, /useEffect\(\(\) => \{\s*setDismissed\(false\);\s*\}, \[pathname, shouldShowGuide\]\)/)
  assert.doesNotMatch(guide, /searchParams\?\.toString\(\)/)
  assert.doesNotMatch(guide, /\[pathname, query\]/)
})

test('guide discloses that it creates no account, consent, provider, or completion state', () => {
  assert.match(guide, /This demo does not create an account, capture consent, activate providers, or save completion/)
  assert.match(guide, /No account, world, or completion record is created/)
  assert.match(guide, /No task, permission, or real-world action is approved/)
  assert.match(guide, /does not store, import, or create a personal memory/)
  assert.match(guide, /No consent, privacy preference, export, deletion, or model permission is changed/)
})

test('guide has no executable persistence or network mechanism', () => {
  for (const [label, pattern] of forbiddenExecutablePatterns) {
    assert.doesNotMatch(executableGuide, pattern, `guided demo must not contain ${label}`)
  }

  const commentOnlyFixture = stripComments('// localStorage.setItem("dismissed", "1")\nconst safe = true')
  assert.doesNotMatch(commentOnlyFixture, forbiddenExecutablePatterns[0][1])
  assert.match(guide, /Close demo/)
  assert.doesNotMatch(guide, />Skip</)
})

test('guided demo disclosure text is readable in the existing card layout', () => {
  assert.match(styles, /\.uraiV2OnboardingCard span, \.uraiV2OnboardingCard strong, \.uraiV2OnboardingCard p \{ grid-column: 1 \/ -1; \}/)
  assert.match(styles, /\.uraiV2OnboardingCard p \{ margin: 0;/)
})
