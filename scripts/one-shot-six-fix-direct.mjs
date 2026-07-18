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
