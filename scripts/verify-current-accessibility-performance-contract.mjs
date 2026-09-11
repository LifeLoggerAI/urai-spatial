import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const repoRoot = fileURLToPath(new URL('..', import.meta.url))
const read = (relative) => readFile(new URL(`../${relative}`, import.meta.url), 'utf8')
const [evidence, runtime, events, companion] = await Promise.all([
  read('urai-tier1/tests/accessibility-performance-evidence.spec.ts'),
  read('urai-tier1/src/app/HomeSpatialRuntimeLayer.tsx'),
  read('urai-tier1/src/spatial/world/worldEvents.ts'),
  read('urai-tier1/src/spatial/world/PersistentWorldCompanion.tsx'),
])

function requireMatch(source, expression, label) {
  if (!expression.test(source)) throw new Error(`Current accessibility-performance contract missing: ${label}`)
}

requireMatch(evidence, /data-testid=\"urai-home-accessible-fallback\"\]\[data-webgl-state=\"unavailable\"\]/, 'single no-WebGL Home fallback selector')
requireMatch(evidence, /fallback\)\.toHaveCount\(1\)/, 'single fallback ownership assertion')
requireMatch(evidence, /Accessible Home destinations/, 'accessible Home destination navigation')
requireMatch(evidence, /data-home-navigation-owner', 'runtime-boundary'/, 'runtime-boundary semantic navigation owner')
requireMatch(evidence, /Open URAI Orb companion/, 'canonical semantic Orb name')
requireMatch(evidence, /Orb menu enters focus, closes on Escape, and returns focus/, 'Orb focus lifecycle proof')
requireMatch(evidence, /firstDestination\)\.toBeFocused\(\)/, 'Orb first-control focus assertion')
requireMatch(evidence, /await page\.keyboard\.press\('Escape'\)/, 'Orb Escape close assertion')
requireMatch(evidence, /await expect\(orb\)\.toBeFocused\(\)/, 'exact Orb activator focus return assertion')
requireMatch(evidence, /WebGL context loss recovery is bounded and preserves the route/, 'bounded WebGL recovery proof')
requireMatch(evidence, /data-webgl-recovery-attempts', '1'/, 'single recovery attempt assertion')

const semanticOrbCount = (runtime.match(/data-testid=\"home-semantic-orb\"/g) || []).length
if (semanticOrbCount !== 1) throw new Error(`Expected one canonical Home semantic Orb control; found ${semanticOrbCount}`)
requireMatch(runtime, /requestUraiWorldOrbOpen\(event\.currentTarget\)/, 'semantic Orb activation retains exact activator')
requireMatch(runtime, /data-home-navigation-owner=\"runtime-boundary\"/, 'runtime semantic navigation ownership')
requireMatch(runtime, /data-webgl-state=\{rendererState\}/, 'observable Home WebGL state')
requireMatch(runtime, /rendererState === 'recovering'/, 'observable recovering state')
requireMatch(runtime, /rendererState === 'failed'/, 'accessible unrecoverable fallback state')

requireMatch(events, /let pendingOrbOpenDetail/, 'lossless pending Orb activation slot')
requireMatch(events, /export function takePendingUraiWorldOrbOpen/, 'atomic pending Orb activation consumption')
requireMatch(companion, /useLayoutEffect\(\(\) => \{/, 'pre-paint Orb event subscription')
requireMatch(companion, /takePendingUraiWorldOrbOpen\(\)/, 'pending Orb request consumption')
requireMatch(companion, /flushSync\(\(\) => setOpen\(true\)\)/, 'deterministic companion opening')
requireMatch(companion, /externalActivatorRef\.current\?\.focus/, 'exact activating-control focus return')

process.stdout.write(`${JSON.stringify({
  ok: true,
  verifier: 'read-only-current-accessibility-performance-contract',
  evidenceFile: 'urai-tier1/tests/accessibility-performance-evidence.spec.ts',
  runtimeOwner: 'HomeSpatialRuntimeLayer',
  semanticOrbOwners: semanticOrbCount,
}, null, 2)}\nCURRENT_ACCESSIBILITY_PERFORMANCE_CONTRACT_OK\n`)
