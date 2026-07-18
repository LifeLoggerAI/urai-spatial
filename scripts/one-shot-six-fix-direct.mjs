import fs from 'node:fs'

const read = (path) => fs.readFileSync(path, 'utf8')
const write = (path, value) => fs.writeFileSync(path, value)
const replaceOnce = (path, before, after) => {
  const source = read(path)
  const first = source.indexOf(before)
  if (first < 0) throw new Error(`Expected source not found in ${path}`)
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`Expected unique source duplicated in ${path}`)
  write(path, source.slice(0, first) + after + source.slice(first + before.length))
}

const lifeMap = 'urai-tier1/src/components/lifemap/AdaptiveLifeMapScene.tsx'
replaceOnce(lifeMap,
`  const textureResolution = selected
    ? profile.tier === "high" ? 512 : 384
    : overview
      ? profile.tier === "high" ? 128 : 96
      : related
        ? profile.tier === "high" ? 224 : 160
        : 80;`,
`  const textureResolution = selected
    ? profile.tier === "high" ? 512 : 384
    : profile.tier === "high" ? 128 : 96;`)
replaceOnce(lifeMap,
`  const queryNodeId = safeToken(params.get("node") || params.get("nodeId") || params.get("memoryId"));
  const manifestId = safeToken(params.get("manifestId"), DEFAULT_MANIFEST_ID);`,
`  const queryNodeId = safeToken(params.get("node") || params.get("nodeId") || params.get("memoryId"));
  const overviewRequested = params.get("overview") === "1";
  const manifestId = safeToken(params.get("manifestId"), DEFAULT_MANIFEST_ID);`)
replaceOnce(lifeMap,
`  useEffect(() => {
    if (!queryNodeId || !nodes.length) return;`,
`  useEffect(() => {
    if (overviewRequested || !queryNodeId || !nodes.length) return;`)
replaceOnce(lifeMap,
`  }, [nodes, queryNodeId]);`,
`  }, [nodes, overviewRequested, queryNodeId]);`)
replaceOnce(lifeMap,
`  const recenter = useCallback(() => {
    setSelectedId(null);
    setCameraIntent(OVERVIEW_CAMERA);
    setNarratorText("Back to the whole private constellation. Select any star to enter it.");
    router.replace("/life-map", { scroll: false });
  }, [router]);`,
`  const recenter = useCallback(() => {
    const preservedMemoryId = selectedId || queryNodeId;
    setSelectedId(null);
    setCameraIntent(OVERVIEW_CAMERA);
    setNarratorText("Back to the whole private constellation. Select any star to enter it.");
    const next = new URLSearchParams();
    if (preservedMemoryId) next.set("memoryId", preservedMemoryId);
    if (manifestId) next.set("manifestId", manifestId);
    next.set("overview", "1");
    router.replace(\`/life-map?\${next.toString()}\`, { scroll: false });
  }, [manifestId, queryNodeId, router, selectedId]);`)

const home = 'urai-tier1/src/app/EmbodiedHomeSpatialCanvas.tsx'
replaceOnce(home,
`    update()
    media.addEventListener?.('change', update)
    return () => media.removeEventListener?.('change', update)`,
`    update()
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', update)
      return () => media.removeEventListener('change', update)
    }
    media.addListener(update)
    return () => media.removeListener(update)`)

const ground = 'urai-tier1/src/app/GroundSpatialWorldClean.tsx'
replaceOnce(ground,
`    update();
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);`,
`    update();
    if (typeof query.addEventListener === "function") {
      query.addEventListener("change", update);
      return () => query.removeEventListener("change", update);
    }
    query.addListener(update);
    return () => query.removeListener(update);`)
replaceOnce(ground,
`              const target = event.currentTarget;
              target.scrollIntoView({ block: "nearest", inline: "center" });
              window.requestAnimationFrame(() => target.scrollIntoView({ block: "nearest", inline: "center" }));`,
`              event.currentTarget.scrollIntoView({ block: "nearest", inline: "center" });
              const target = event.currentTarget;
              const reveal = () => target.scrollIntoView({ block: "nearest", inline: "center" });
              window.requestAnimationFrame(() => window.requestAnimationFrame(reveal));`)
replaceOnce(ground,
`.ground-destination-compass :is(a,button){display:inline-flex;`,
`.ground-destination-compass :is(a,button){display:inline-flex;scroll-margin-inline:12px;`)
replaceOnce(ground,
`touch-action:pan-x}`,
`touch-action:pan-x;scroll-padding-inline:12px}`)

const navigation = 'urai-tier1/src/spatial/navigation/EmbodiedNavigation.tsx'
replaceOnce(navigation,
`  const damping = requested.lengthSq() > 0 ? acceleration : deceleration
  velocity.x = THREE.MathUtils.damp(velocity.x, requested.x, damping, delta)
  velocity.z = THREE.MathUtils.damp(velocity.z, requested.z, damping, delta)

  const next = MOTION_NEXT.copy(position).addScaledVector(velocity, Math.min(delta, 0.05))`,
`  const damping = requested.lengthSq() > 0 ? acceleration : deceleration
  const clampedDelta = Math.min(delta, 0.05)
  velocity.x = THREE.MathUtils.damp(velocity.x, requested.x, damping, clampedDelta)
  velocity.z = THREE.MathUtils.damp(velocity.z, requested.z, damping, clampedDelta)

  const next = MOTION_NEXT.copy(position).addScaledVector(velocity, clampedDelta)`)

const sourceContract = 'urai-tier1/tests/accessibility-performance-source-contract.test.mjs'
replaceOnce(sourceContract,
String.raw`  requireNormalizedPattern(ground, /event\.currentTarget\.scrollIntoView\(\{\s*block:\s*'nearest',\s*inline:\s*'center',?\s*\}\)/, 'Ground focus must remain visible without depending on formatting')`,
String.raw`  requireText(ground, 'event.currentTarget.scrollIntoView')
  requireNormalizedPattern(ground, /block:\s*'nearest'/, 'Ground focus reveal must use the nearest block boundary')
  requireNormalizedPattern(ground, /inline:\s*'center'/, 'Ground focus reveal must center the destination inline')`)

const restorationContract = 'urai-tier1/tests/continuous-spatial-restoration-contract.test.mjs'
replaceOnce(restorationContract,
String.raw`  assert.match(layer, /data-urai-home-runtime="one-continuous-webgl-world"/)`,
String.raw`  assert.match(layer, /data-urai-home-runtime="embodied-continuous-webgl-world"/)
  assert.match(layer, /data-home-exploration="walkable"/)`)
replaceOnce(restorationContract,
String.raw`  assert.match(layer, /HomeSpatialCanvas, \{ useWebGLAvailable \}/)`,
String.raw`  assert.match(layer, /EmbodiedHomeSpatialCanvas/)
  assert.match(layer, /import \{ useWebGLAvailable \} from '.\/HomeSpatialCanvas'/)`)
replaceOnce(restorationContract,
String.raw`  assert.match(groundCanonical, /window\.addEventListener\('keydown',\s*handleKeyDown\)/)
  assert.match(groundCanonical, /window\.removeEventListener\('keydown',\s*handleKeyDown\)/)
  assert.match(groundCanonical, /event\.key\s*===\s*'Escape'/)
  assert.match(groundCanonical, /event\.key\s*===\s*'Enter'/)
  assert.match(groundCanonical, /event\.key\s*===\s*'ArrowRight'\s*\|\|\s*event\.key\s*===\s*'ArrowDown'/)
  assert.match(groundCanonical, /event\.key\s*===\s*'ArrowLeft'\s*\|\|\s*event\.key\s*===\s*'ArrowUp'/)`,
`  assert.ok(includesCanonical(groundWorld, 'useMovementInput({'))
  assert.ok(includesCanonical(groundWorld, 'onEscape: () => {'))
  assert.ok(includesCanonical(groundWorld, 'onInteract: () => {'))
  assert.ok(includesCanonical(groundWorld, 'onReset: resetOrientation'))
  assert.ok(includesCanonical(groundWorld, '<MobileMovementPad'))
  assert.ok(includesCanonical(groundWorld, 'Escape returns Home.'))`)
replaceOnce(restorationContract,
String.raw`  assert.match(proof, /page\.locator\('\.urai-home-spatial-threshold'\)/)`,
String.raw`  assert.match(proof, /getByRole\('navigation', \{ name: 'Direct Home destinations' \}\)/)`)

const finalConvergenceContract = 'urai-tier1/tests/final-aaa-world-convergence-contract.test.mjs'
replaceOnce(finalConvergenceContract,
`const lifeMapConvergence = read('src/spatial/world/lifeMapConvergence.css')`,
`const lifeMapConvergence = read('src/spatial/world/lifeMapConvergence.css')
const adaptiveLifeMap = read('src/components/lifemap/AdaptiveLifeMapScene.tsx')`)
replaceOnce(finalConvergenceContract,
String.raw`  assert.match(lifeMapConvergence, /data-testid='urai-true-3d-life-map'/)`,
String.raw`  assert.match(adaptiveLifeMap, /data-testid="urai-true-3d-life-map"/)
  assert.match(lifeMapConvergence, /\.life-map-independent-realm/)`)
replaceOnce(finalConvergenceContract,
String.raw`  assert.match(lifeMapConvergence, /> header[\s\S]*display:\s*none\s*!important/)`,
String.raw`  assert.doesNotMatch(adaptiveLifeMap, /<header\b/)
  assert.match(adaptiveLifeMap, /className="life-map-accessibility-menu"/)`)
replaceOnce(finalConvergenceContract,
String.raw`  assert.match(lifeMapConvergence, /aria-label='URAI Life Map route portals'/)`,
String.raw`  assert.match(adaptiveLifeMap, />Ground<\/button>/)
  assert.match(adaptiveLifeMap, />Home<\/button>/)`)

const lifeMapBehaviorContract = 'urai-tier1/tests/lifemap-scene-behavior.test.mjs'
{
  const source = read(lifeMapBehaviorContract)
  const lines = source.split('\n')
  const start = lines.findIndex((line) => line.includes('Overview memories must use small textures.'))
  const end = lines.findIndex((line) => line.includes('Non-related memories must use the smallest allocation before commit-phase texture state.'))
  if (start < 0 || end < start) throw new Error(`Expected legacy texture assertions not found in ${lifeMapBehaviorContract}`)
  const legacyCount = lines.filter((line) => line.includes('Overview memories must use small textures.') || line.includes('Related memories must use medium textures.') || line.includes('Non-related memories must use the smallest allocation before commit-phase texture state.')).length
  if (legacyCount !== 3) throw new Error(`Expected exactly three legacy texture assertions in ${lifeMapBehaviorContract}`)
  lines.splice(start, end - start + 1,
    `  assert.match(source, /:\\s*profile\\.tier === "high"\\s*\\?\\s*128\\s*:\\s*96;/, 'Every unselected memory must use the bounded small texture allocation.')`,
    `  assert.doesNotMatch(source, /related\\s*\\?\\s*profile\\.tier === "high"\\s*\\?\\s*224\\s*:\\s*160/, 'Unselected memories must not retain a separate medium allocation tier.')`,
    `  assert.doesNotMatch(source, /:\\s*80;/, 'Unselected memories must use one quality-bounded allocation rather than a hidden fourth tier.')`,
  )
  write(lifeMapBehaviorContract, lines.join('\n'))
}

const doorwayContract = 'urai-tier1/tests/persistent-world-doorway-regression.test.mjs'
replaceOnce(doorwayContract,
String.raw`  assert.match(visualAudit, /check\.name === 'life-map-to-focus'/)
  assert.match(visualAudit, /summary:has-text\("Map controls"\)/)
  assert.match(visualAudit, /\.life-map-accessibility-menu button/)
  assert.match(visualAudit, /check\.name !== 'life-map-to-focus'/)
  assert.match(visualAudit, /Open Orb travel controls/)
  assert.match(visualAudit, /waitForURL\(\(url\) => url\.toString\(\)\.includes\(check\.expected\), \{ timeout: 7000 \}\)/)`,
String.raw`  assert.match(visualAudit, /button\[data-world-target=\\"focus\\"\]/)
  assert.match(visualAudit, /a\[data-urai-audit-action=\\"life-map-focus\\"\]/)
  assert.match(visualAudit, /let found = await firstVisible\(page, check\.selectors\)/)
  assert.doesNotMatch(visualAudit, /check\.name/)
  assert.match(visualAudit, /Open Orb travel controls/)
  assert.match(visualAudit, /waitForURL\(\(url\) => url\.toString\(\)\.includes\(check\.expected\), \{ timeout: 7000 \}\)/)`)
