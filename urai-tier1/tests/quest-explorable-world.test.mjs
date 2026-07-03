import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

const pageUrl = new URL(
  '../src/app/spatial/ar-vr/page.tsx',
  import.meta.url,
)

const worldUrl = new URL(
  '../src/app/spatial/ar-vr/UraiQuestEntryWorldV2.tsx',
  import.meta.url,
)

const runtimeUrl = new URL(
  '../src/app/spatial/ar-vr/xrEntryWorldRuntime.ts',
  import.meta.url,
)

const entryUrl = new URL(
  '../src/app/spatial/ar-vr/QuestVrEntryButton.tsx',
  import.meta.url,
)

test(
  'Quest route is owned by the corrected explorable real-time world',
  async () => {
    const source = await readFile(pageUrl, 'utf8')

    assert.match(source, /UraiQuestEntryWorldV2/)
    assert.doesNotMatch(source, /urai-xr-portal__stars/)
  },
)

test(
  'runtime creates geometry, lighting, floor boundaries and spatial portals',
  async () => {
    const source = await readFile(runtimeUrl, 'utf8')

    assert.match(source, /WebGLRenderer/)
    assert.match(source, /HemisphereLight/)
    assert.match(source, /DirectionalLight/)
    assert.match(source, /CircleGeometry/)
    assert.match(source, /CylinderGeometry/)
    assert.match(source, /BoxGeometry/)
    assert.match(source, /portalTargets/)
    assert.match(source, /THREE\.MathUtils\.clamp/)
  },
)

test(
  'desktop, touch and Quest locomotion controls remain explicit',
  async () => {
    const world = await readFile(worldUrl, 'utf8')
    const runtime = await readFile(runtimeUrl, 'utf8')

    assert.match(runtime, /KeyW/)
    assert.match(runtime, /KeyA/)
    assert.match(runtime, /KeyQ/)
    assert.match(runtime, /getController/)
    assert.match(
      runtime,
      /intersectObject\(\s*this\.floor/,
    )
    assert.match(runtime, /Math\.PI\s*\/\s*6/)
    assert.match(runtime, /SPAWN_Z/)

    assert.match(world, /Exit VR safely/)
    assert.match(world, /Recenter/)
    assert.match(world, /Reduced motion/)
    assert.match(world, /Touch movement controls/)
    assert.match(world, /right thumbstick snaps 30°/)
  },
)

test(
  'post-merge boundary hardening keeps navigation and input safe',
  async () => {
    const world = await readFile(worldUrl, 'utf8')

    assert.match(
      world,
      /route\s*===\s*['"]\/spatial\/life-map['"]\s*\?\s*['"]\/life-map['"]\s*:\s*route/,
    )

    assert.match(
      world,
      /source\.handedness\s*===\s*['"]right['"]/,
    )

    assert.match(
      world,
      /source\.handedness\s*!==\s*['"]left['"]/,
    )

    assert.match(
      world,
      /window\.addEventListener\(\s*['"]blur['"]/,
    )

    assert.match(
      world,
      /document\.addEventListener\(\s*['"]visibilitychange['"]/,
    )

    assert.match(
      world,
      /window\.removeEventListener\(\s*['"]blur['"]/,
    )

    assert.match(
      world,
      /document\.removeEventListener\(\s*['"]visibilitychange['"]/,
    )

    assert.match(world, /clearHeldControls/)

    assert.match(
      world,
      /runtime\.session\s*=\s*null/,
    )

    assert.match(
      world,
      /runtimeRef\.current\s*=\s*null/,
    )
  },
)

test(
  'Quest session is attached to the active renderer and cleaned up safely',
  async () => {
    const world = await readFile(worldUrl, 'utf8')
    const entry = await readFile(entryUrl, 'utf8')

    assert.match(
      entry,
      /requiredFeatures:\s*\[\s*['"]local-floor['"]\s*\]/,
    )

    assert.match(entry, /bounded-floor/)
    assert.match(entry, /hand-tracking/)

    assert.match(
      world,
      /renderer\.xr\.setSession\(/,
    )

    assert.match(
      world,
      /runtimeSessionForRightHandTurning/,
    )

    assert.match(
      world,
      /handleSessionEnded/,
    )

    assert.match(
      world,
      /await\s+runtime\.session\.end\(\)/,
    )

    assert.match(
      world,
      /data-renderer-ready/,
    )

    assert.match(
      world,
      /QUEST_IMMERSIVE_ENTRY_VERIFIED_MINIMAL_SHELL/,
    )

    assert.doesNotMatch(
      world,
      /QUEST_FULL_URAI_WORLD_VERIFIED/,
    )
  },
)

test(
  'XR world source contains no unresolved merge-conflict markers',
  async () => {
    const sources = await Promise.all([
      readFile(pageUrl, 'utf8'),
      readFile(worldUrl, 'utf8'),
      readFile(runtimeUrl, 'utf8'),
      readFile(entryUrl, 'utf8'),
    ])

    for (const source of sources) {
      assert.doesNotMatch(source, /^<<<<<<< /m)
      assert.doesNotMatch(source, /^=======\s*$/m)
      assert.doesNotMatch(source, /^>>>>>>> /m)
    }
  },
)