import fs from 'node:fs'

const replaceRequired = (path, pattern, replacement, label) => {
  const source = fs.readFileSync(path, 'utf8')
  const found = typeof pattern === 'string' ? source.includes(pattern) : pattern.test(source)
  if (!found) throw new Error(`Missing ${label} in ${path}`)
  const next = source.replace(pattern, replacement)
  if (next === source) throw new Error(`No change while applying ${label} in ${path}`)
  fs.writeFileSync(path, next)
  console.log(`Applied ${label}`)
}

const adaptive = 'urai-tier1/src/components/lifemap/AdaptiveLifeMapScene.tsx'

replaceRequired(
  adaptive,
  /type MemoryPortalHandlers = \{[\s\S]*?\};\n\n/,
  '',
  'unused Three-scene portal handler type removal',
)

replaceRequired(
  adaptive,
  /function MemoryArtifact\(\{ node, selected, related, overview, profile, onSelect, onEnterFocus, onEnterReplay, onOverview \}: \{[\s\S]*?onSelect: \(node: LifeMapNode\) => void;\n\} & MemoryPortalHandlers\) \{/,
  `function MemoryArtifact({ node, selected, related, overview, profile, onSelect }: {
  node: LifeMapNode;
  selected: boolean;
  related: boolean;
  overview: boolean;
  profile: SpatialQualityProfile;
  onSelect: (node: LifeMapNode) => void;
}) {`,
  'MemoryArtifact portal prop removal',
)

replaceRequired(
  adaptive,
  /\n\s*\{selected \? \(\n\s*<Html distanceFactor=\{8\.2\}[\s\S]*?<\/Html>\n\s*\) : null\}/,
  '',
  'projected selected-action Html removal',
)

replaceRequired(
  adaptive,
  /function LifeMapWorld\(\{ nodes, selectedNode, profile, cameraIntent, onSelect, onEnterFocus, onEnterReplay, onOverview \}: \{[\s\S]*?onSelect: \(node: LifeMapNode\) => void;\n\} & MemoryPortalHandlers\) \{/,
  `function LifeMapWorld({ nodes, selectedNode, profile, cameraIntent, onSelect }: {
  nodes: LifeMapNode[];
  selectedNode: LifeMapNode | null;
  profile: SpatialQualityProfile;
  cameraIntent: CameraIntent;
  onSelect: (node: LifeMapNode) => void;
}) {`,
  'LifeMapWorld portal prop removal',
)

replaceRequired(
  adaptive,
  /\n\s*onEnterFocus=\{onEnterFocus\}\n\s*onEnterReplay=\{onEnterReplay\}\n\s*onOverview=\{onOverview\}/,
  '',
  'MemoryArtifact call portal prop removal',
)

replaceRequired(
  adaptive,
  /\n\s*onEnterFocus=\{enterFocus\}\n\s*onEnterReplay=\{enterReplay\}\n\s*onOverview=\{recenter\}/,
  '',
  'LifeMapWorld call portal prop removal',
)

replaceRequired(
  adaptive,
  /      <\/Canvas>\n\n      <div className="life-map-realm-mark" aria-hidden="true">/,
  `      </Canvas>

      {selectedNode ? (
        <nav
          className="life-map-memory-portals"
          aria-label="Selected memory actions"
          data-life-map-selected-actions-owner="route-dom-overlay"
          onPointerDown={(event) => event.stopPropagation()}
          onWheel={(event) => event.stopPropagation()}
        >
          <button type="button" onClick={() => enterFocus(selectedNode)}>Enter Focus</button>
          <button type="button" onClick={() => enterReplay(selectedNode)} disabled={!selectedNode.replayAvailable || selectedNode.locked}>Replay</button>
          <button type="button" onClick={recenter}>Overview</button>
        </nav>
      ) : null}

      <div className="life-map-realm-mark" aria-hidden="true">`,
  'route-owned selected action overlay insertion',
)

const css = 'urai-tier1/src/spatial/world/lifeMapSelectedCinematic.css'
replaceRequired(
  css,
  /\.life-map-independent-realm\[data-life-map-mode='selected'\] \.life-map-memory-portals \{[\s\S]*?\n\}/,
  `.life-map-independent-realm[data-life-map-mode='selected'] .life-map-memory-portals {
  position: fixed;
  z-index: 90;
  left: max(20px, env(safe-area-inset-left));
  right: max(20px, env(safe-area-inset-right));
  top: clamp(450px, 62svh, 660px);
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  width: auto;
  max-width: 560px;
  margin-inline: auto;
  box-sizing: border-box;
  transform: none;
  pointer-events: auto;
}`,
  'viewport-owned desktop selected action CSS',
)

replaceRequired(
  css,
  /@media \(max-width: 760px\) \{\n  \.life-map-independent-realm\[data-life-map-mode='selected'\] \.life-map-memory-portals \{[\s\S]*?\n  \}/,
  `@media (max-width: 760px) {
  .life-map-independent-realm[data-life-map-mode='selected'] .life-map-memory-portals {
    left: max(12px, env(safe-area-inset-left));
    right: max(12px, env(safe-area-inset-right));
    top: clamp(400px, 62svh, 590px);
    gap: 4px;
    width: auto;
    max-width: none;
    padding: 5px;
    transform: none;
  }`,
  'safe-area mobile selected action CSS',
)

const deepLink = 'urai-tier1/tests/lifemap-deep-link-controls-contract.test.mjs'
replaceRequired(
  deepLink,
  /test\('canonical Life Map has one selected-memory owner inside the spatial lens scene',[\s\S]*?\n\}\)\n\n(?=test\('selected-memory identity)/,
  String.raw`test('canonical Life Map has one selected-memory owner in the route DOM overlay', () => {
  assert.match(canonical, /<LifeMapRouteBoundary \/>/)
  assert.match(canonical, /<Suspense/)
  assert.match(canonical, /data-selected-memory-owner="spatial-lens-only"/)
  assert.doesNotMatch(canonical, /LifeMapDeepLinkControls|urai-lifemap-deep-link-controls/)
  assert.match(adaptive, /className="life-map-memory-portals"/)
  assert.match(adaptive, /data-life-map-selected-actions-owner="route-dom-overlay"/)
  assert.match(adaptive, /onClick=\{\(\) => enterFocus\(selectedNode\)\}/)
  assert.match(adaptive, /onClick=\{\(\) => enterReplay\(selectedNode\)\}/)
  assert.doesNotMatch(adaptive, /<Html distanceFactor=\{8\.2\}/)
})

`,
  'route DOM owner contract test',
)

replaceRequired(
  deepLink,
  String.raw`  assert.match(adaptive, /\{selected \? \(/)`,
  String.raw`  assert.match(adaptive, /\{selectedNode \? \(/)`,
  'route-owned Overview selected-state contract',
)

replaceRequired(
  deepLink,
  /test\('selected mode raises the spatial realm and keeps one three-column action surface inside desktop and mobile viewports',[\s\S]*?\n\}\)\n\n(?=test\('schema-7)/,
  String.raw`test('selected mode raises the spatial realm and keeps one route-owned action surface inside desktop and mobile viewports', () => {
  assert.match(shell, /import '\.\/lifeMapSelectedCinematic\.css'/)
  assert.match(selectedCinematic, /data-life-map-mode='selected'/)
  assert.match(selectedCinematic, /> \.life-map-independent-realm/)
  assert.match(selectedCinematic, /z-index: 70/)
  assert.match(selectedCinematic, /data-life-map-authored-universe='primary'/)
  assert.match(selectedCinematic, /opacity: \.04 !important/)
  assert.match(adaptive, /data-life-map-selected-actions-owner="route-dom-overlay"/)
  assert.doesNotMatch(adaptive, /<Html distanceFactor=\{8\.2\}/)
  assert.match(selectedCinematic, /\.life-map-memory-portals/)
  assert.match(selectedCinematic, /z-index: 90/)
  assert.match(selectedCinematic, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/)
  assert.match(selectedCinematic, /position: fixed/)
  assert.match(selectedCinematic, /left: max\(20px, env\(safe-area-inset-left\)\)/)
  assert.match(selectedCinematic, /right: max\(20px, env\(safe-area-inset-right\)\)/)
  assert.match(selectedCinematic, /top: clamp\(450px, 62svh, 660px\)/)
  assert.match(selectedCinematic, /width: auto/)
  assert.match(selectedCinematic, /max-width: 560px/)
  assert.match(selectedCinematic, /transform: none/)
  assert.match(selectedCinematic, /min-height: 52px/)
  assert.match(selectedCinematic, /@media \(max-width: 760px\)[\s\S]*left: max\(12px, env\(safe-area-inset-left\)\)/)
  assert.match(selectedCinematic, /@media \(max-width: 760px\)[\s\S]*right: max\(12px, env\(safe-area-inset-right\)\)/)
  assert.match(selectedCinematic, /@media \(max-width: 760px\)[\s\S]*top: clamp\(400px, 62svh, 590px\)/)
  assert.match(selectedCinematic, /@media \(max-width: 760px\)[\s\S]*min-height: 48px/)
  assert.match(adaptive, /data-life-map-overview-list="true"/)
  assert.match(adaptive, /data-life-map-selected-actions="true"/)
  assert.match(adaptive, /data-life-map-route-actions="true"/)
  assert.match(selectedCinematic, /data-life-map-mode='selected'[\s\S]*data-life-map-overview-list='true'[\s\S]*display: none !important/)
  assert.doesNotMatch(selectedCinematic, /data-life-map-mode='selected'[\s\S]*\.life-map-accessibility-menu > div[\s\S]*display: none !important/)
})

`,
  'selected route action containment contract test',
)

const finalContract = 'urai-tier1/tests/final-aaa-world-convergence-contract.test.mjs'
replaceRequired(
  finalContract,
  /test\('Life Map renders synchronous luminous lenses with dominant selected mode',[\s\S]*?\n\}\)\s*$/,
  String.raw`test('Life Map renders synchronous luminous lenses with dominant selected mode', () => {
  assert.match(adaptiveLifeMap, /memoryLensPath/)
  assert.match(adaptiveLifeMap, /const texture = useMemo\(\(\) => createMemorySurface\(node, textureResolution\)/)
  assert.match(adaptiveLifeMap, /const textureKey = texture\?\.uuid/)
  assert.match(adaptiveLifeMap, /key=\{textureKey \+ "-main"\}/)
  assert.match(adaptiveLifeMap, /color=\{texture \? "#ffffff" : "#071425"\}/)
  assert.match(adaptiveLifeMap, /data-life-map-memory-contract="synchronous-luminous-memory-lenses"/)
  assert.match(adaptiveLifeMap, /data-life-map-mode=\{selectedNode \? "selected" : "overview"\}/)
  assert.match(adaptiveLifeMap, /data-selected=\{selectedNode \? "true" : "false"\}/)
  assert.match(adaptiveLifeMap, /name="life-map-memory-lens-hit-target"/)
  assert.match(adaptiveLifeMap, /opacity=\{texture \? visibleOpacity : 0\}/)
  assert.doesNotMatch(adaptiveLifeMap, /useState<THREE\.CanvasTexture \| null>|setTexture\(|map=\{texture \?\? undefined\}/)
  assert.match(lifeMapConvergence, /AAA MEMORY LENS SELECTION CONVERGENCE/)
  assert.match(lifeMapConvergence, /data-life-map-mode='selected'/)
  assert.match(lifeMapConvergence, /life-map-whisper\[data-selected='true'\]/)
  assert.match(adaptiveLifeMap, /data-life-map-selected-actions-owner="route-dom-overlay"/)
  assert.doesNotMatch(adaptiveLifeMap, /<Html distanceFactor=\{8\.2\}/)
  assert.match(lifeMapSelectedCinematic, /data-life-map-mode='selected'[\s\S]*\.life-map-memory-portals/)
  assert.match(lifeMapSelectedCinematic, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/)
  assert.match(lifeMapSelectedCinematic, /position: fixed/)
  assert.match(lifeMapSelectedCinematic, /left: max\(20px, env\(safe-area-inset-left\)\)/)
  assert.match(lifeMapSelectedCinematic, /right: max\(20px, env\(safe-area-inset-right\)\)/)
  assert.match(lifeMapSelectedCinematic, /top: clamp\(450px, 62svh, 660px\)/)
  assert.match(lifeMapSelectedCinematic, /width: auto/)
  assert.match(lifeMapSelectedCinematic, /max-width: 560px/)
  assert.match(lifeMapSelectedCinematic, /transform: none/)
  assert.match(lifeMapSelectedCinematic, /@media \(max-width: 760px\)[\s\S]*left: max\(12px, env\(safe-area-inset-left\)\)/)
  assert.match(lifeMapSelectedCinematic, /@media \(max-width: 760px\)[\s\S]*right: max\(12px, env\(safe-area-inset-right\)\)/)
  assert.match(lifeMapSelectedCinematic, /@media \(max-width: 760px\)[\s\S]*top: clamp\(400px, 62svh, 590px\)/)
  assert.match(lifeMapSelectedCinematic, /@media \(max-width: 760px\)[\s\S]*min-height: 48px/)
  assert.match(adaptiveLifeMap, /data-life-map-overview-list="true"/)
  assert.match(adaptiveLifeMap, /data-life-map-selected-actions="true"/)
  assert.match(lifeMapSelectedCinematic, /data-life-map-mode='selected'[\s\S]*data-life-map-overview-list='true'[\s\S]*display: none !important/)
  assert.doesNotMatch(lifeMapSelectedCinematic, /data-life-map-mode='selected'[\s\S]*\.life-map-accessibility-menu > div[\s\S]*display: none !important/)
})
`,
  'final AAA route DOM owner contract test',
)

console.log('Applied route-owned selected-memory action overlay repair')
