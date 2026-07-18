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
replaceOnce(
  lifeMap,
  `  const [selectedId, setSelectedId] = useState<string | null>(() => queryNodeId || initial.current?.selectedId || null);\n  const [cameraIntent, setCameraIntent] = useState<CameraIntent>(() => initial.current?.cameraIntent || OVERVIEW_CAMERA);`,
  `  const [selectedId, setSelectedId] = useState<string | null>(() => overviewRequested ? null : queryNodeId || initial.current?.selectedId || null);\n  const [cameraIntent, setCameraIntent] = useState<CameraIntent>(() => overviewRequested ? OVERVIEW_CAMERA : initial.current?.cameraIntent || OVERVIEW_CAMERA);`,
)
replaceOnce(
  lifeMap,
  `  const recenter = useCallback(() => {\n    const preservedMemoryId = selectedId || queryNodeId;\n    setSelectedId(null);\n    setCameraIntent(OVERVIEW_CAMERA);\n    setNarratorText("Back to the whole private constellation. Select any star to enter it.");\n    const next = new URLSearchParams();\n    if (preservedMemoryId) next.set("memoryId", preservedMemoryId);\n    if (manifestId) next.set("manifestId", manifestId);\n    next.set("overview", "1");\n    router.replace(\`/life-map?\${next.toString()}\`, { scroll: false });\n  }, [manifestId, queryNodeId, router, selectedId]);`,
  `  const recenter = useCallback(() => {\n    const preservedMemoryId = selectedId || queryNodeId;\n    setSelectedId(null);\n    setCameraIntent(OVERVIEW_CAMERA);\n    setNarratorText("Back to the whole private constellation. Select any star to enter it.");\n    const next = new URLSearchParams();\n    if (preservedMemoryId) next.set("memoryId", preservedMemoryId);\n    if (manifestId) next.set("manifestId", manifestId);\n    next.set("overview", "1");\n    router.replace(\`/life-map?\${next.toString()}\`, { scroll: false });\n  }, [manifestId, queryNodeId, router, selectedId]);\n\n  useEffect(() => {\n    const onOverviewRequest = () => recenter();\n    window.addEventListener("urai:life-map-overview", onOverviewRequest);\n    return () => window.removeEventListener("urai:life-map-overview", onOverviewRequest);\n  }, [recenter]);`,
)
replaceOnce(
  lifeMap,
  `          {selectedNode ? (\n            <>\n              <button type="button" onClick={() => router.push(identityHref("focus", selectedNode))}>Enter Focus</button>\n              <button type="button" onClick={() => router.push(identityHref("replay", selectedNode))} disabled={!selectedNode.replayAvailable || selectedNode.locked}>Replay</button>\n              <button type="button" onClick={recenter}>Overview</button>\n            </>\n          ) : null}\n          <button type="button" onClick={() => router.push("/ground")}>Ground</button>`,
  `          {selectedNode ? (\n            <>\n              <button type="button" onClick={() => router.push(identityHref("focus", selectedNode))}>Enter Focus</button>\n              <button type="button" onClick={() => router.push(identityHref("replay", selectedNode))} disabled={!selectedNode.replayAvailable || selectedNode.locked}>Replay</button>\n            </>\n          ) : null}\n          <button type="button" data-life-map-overview-control="true" onClick={recenter}>Overview</button>\n          <button type="button" onClick={() => router.push("/ground")}>Ground</button>`,
)

const boundary = 'urai-tier1/src/spatial/world/LifeMapIndependentInputBoundary.tsx'
replaceOnce(
  boundary,
  `function selectedMemoryIsActive() {\n  return new URLSearchParams(window.location.search).has(SELECTED_MEMORY_QUERY_KEY)\n    || Boolean(document.querySelector('.life-map-memory-portals'))\n}`,
  `function selectedMemoryIsActive() {\n  const params = new URLSearchParams(window.location.search)\n  if (params.get('overview') === '1') return false\n  return params.has(SELECTED_MEMORY_QUERY_KEY)\n    || Boolean(document.querySelector('.life-map-memory-portals'))\n}`,
)
replaceOnce(
  boundary,
  `function findOverviewButton() {\n  return [...document.querySelectorAll<HTMLButtonElement>('.life-map-accessibility-menu button')]\n    .find((button) => button.textContent?.trim() === 'Overview')\n}`,
  `function findOverviewButton() {\n  return document.querySelector<HTMLButtonElement>('[data-life-map-overview-control="true"]')\n    ?? [...document.querySelectorAll<HTMLButtonElement>('.life-map-accessibility-menu button')]\n      .find((button) => button.textContent?.trim() === 'Overview')\n}`,
)
replaceOnce(
  boundary,
  `    const overview = () => {\n      const button = findOverviewButton()\n      if (!button) return false\n      button.click()\n      indexRef.current = -1\n      setAnnouncement('Returned to the whole private constellation.')\n      return true\n    }`,
  `    const overview = () => {\n      const button = findOverviewButton()\n      if (button) button.click()\n      else window.dispatchEvent(new CustomEvent('urai:life-map-overview'))\n      indexRef.current = -1\n      setAnnouncement('Returned to the whole private constellation.')\n      return true\n    }`,
)

const navigation = 'urai-tier1/src/spatial/navigation/EmbodiedNavigation.tsx'
replaceOnce(
  navigation,
  `      if (event.code === 'Escape') callbacksRef.current.onEscape?.()`,
  `      if (event.code === 'Escape' && callbacksRef.current.onEscape) {\n        event.preventDefault()\n        event.stopImmediatePropagation()\n        callbacksRef.current.onEscape()\n        return\n      }`,
)
replaceOnce(
  navigation,
  `    window.addEventListener('keydown', onKeyDown, { passive: false })`,
  `    window.addEventListener('keydown', onKeyDown, { passive: false, capture: true })`,
)
replaceOnce(
  navigation,
  `      window.removeEventListener('keydown', onKeyDown)`,
  `      window.removeEventListener('keydown', onKeyDown, true)`,
)

const ground = 'urai-tier1/src/app/GroundSpatialWorldClean.tsx'
replaceOnce(
  ground,
  `.ground-movement-prompt{bottom:max(142px,calc(env(safe-area-inset-bottom) + 132px));min-width:min(320px,calc(100vw - 24px))}`,
  `.ground-movement-prompt{bottom:max(238px,calc(env(safe-area-inset-bottom) + 228px));min-width:min(320px,calc(100vw - 24px))}`,
)

const embodiedContract = 'urai-tier1/tests/embodied-exploration-contract.test.mjs'
replaceOnce(
  embodiedContract,
  `  assert.match(kernel, /event\\.code === 'Enter' \\|\\| event\\.code === 'Space'[\\s\\S]*event\\.preventDefault\\(\\)/)\n  assert.match(kernel, /\\}, \\[enabled\\]\\)/)`,
  `  assert.match(kernel, /event\\.code === 'Enter' \\|\\| event\\.code === 'Space'[\\s\\S]*event\\.preventDefault\\(\\)/)\n  assert.match(kernel, /event\\.code === 'Escape' && callbacksRef\\.current\\.onEscape[\\s\\S]*event\\.preventDefault\\(\\)[\\s\\S]*event\\.stopImmediatePropagation\\(\\)[\\s\\S]*callbacksRef\\.current\\.onEscape\\(\\)/)\n  assert.match(kernel, /addEventListener\\('keydown', onKeyDown, \\{ passive: false, capture: true \\}\\)/)\n  assert.match(kernel, /removeEventListener\\('keydown', onKeyDown, true\\)/)\n  assert.match(kernel, /\\}, \\[enabled\\]\\)/)`,
)
replaceOnce(
  embodiedContract,
  `  assert.match(embodiedLayout, /\\.ground-movement-prompt[\\s\\S]*bottom: max\\(238px/)\n  assert.doesNotMatch(groundScene, /requestPointerLock|sprint|jump|crouch/i)`,
  `  assert.match(embodiedLayout, /\\.ground-movement-prompt[\\s\\S]*bottom: max\\(238px/)\n  assert.match(ground, /ground-movement-prompt\\{bottom:max\\(238px,calc\\(env\\(safe-area-inset-bottom\\) \\+ 228px\\)\\)/)\n  assert.doesNotMatch(groundScene, /requestPointerLock|sprint|jump|crouch/i)`,
)
replaceOnce(
  embodiedContract,
  `  assert.match(lifeMapBoundary, /findOverviewButton/)\n  assert.match(worldShell, /embodiedExplorationLayout\\.css/)`,
  `  assert.match(lifeMapBoundary, /findOverviewButton/)\n  assert.match(lifeMapBoundary, /data-life-map-overview-control/)\n  assert.match(lifeMapBoundary, /urai:life-map-overview/)\n  assert.match(lifeMapBoundary, /params\\.get\\('overview'\\) === '1'/)\n  assert.match(worldShell, /embodiedExplorationLayout\\.css/)`,
)

const finalContract = 'urai-tier1/tests/final-aaa-world-convergence-contract.test.mjs'
replaceOnce(
  finalContract,
  `  assert.match(adaptiveLifeMap, /className="life-map-accessibility-menu"/)\n  assert.match(adaptiveLifeMap, />Ground<\\/button>/)`,
  `  assert.match(adaptiveLifeMap, /className="life-map-accessibility-menu"/)\n  assert.match(adaptiveLifeMap, /overviewRequested \\? null : queryNodeId/)\n  assert.match(adaptiveLifeMap, /overviewRequested \\? OVERVIEW_CAMERA/)\n  assert.match(adaptiveLifeMap, /data-life-map-overview-control="true"/)\n  assert.match(adaptiveLifeMap, /urai:life-map-overview/)\n  assert.match(adaptiveLifeMap, />Ground<\\/button>/)`,
)
