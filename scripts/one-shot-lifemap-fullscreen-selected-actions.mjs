import fs from 'node:fs'

const replaceOnce = (path, before, after) => {
  const source = fs.readFileSync(path, 'utf8')
  const first = source.indexOf(before)
  if (first < 0) throw new Error(`Expected source not found in ${path}: ${before.slice(0, 180)}`)
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`Expected unique source duplicated in ${path}`)
  fs.writeFileSync(path, source.slice(0, first) + after + source.slice(first + before.length))
}

const adaptive = 'urai-tier1/src/components/lifemap/AdaptiveLifeMapScene.tsx'

replaceOnce(
  adaptive,
  `type MemoryPortalHandlers = {
  onEnterFocus: (node: LifeMapNode) => void;
  onEnterReplay: (node: LifeMapNode) => void;
  onOverview: () => void;
};

`,
  '',
)

replaceOnce(
  adaptive,
  `function MemoryArtifact({ node, selected, related, overview, profile, onSelect, onEnterFocus, onEnterReplay, onOverview }: {
  node: LifeMapNode;
  selected: boolean;
  related: boolean;
  overview: boolean;
  profile: SpatialQualityProfile;
  onSelect: (node: LifeMapNode) => void;
} & MemoryPortalHandlers) {`,
  `function MemoryArtifact({ node, selected, related, overview, profile, onSelect }: {
  node: LifeMapNode;
  selected: boolean;
  related: boolean;
  overview: boolean;
  profile: SpatialQualityProfile;
  onSelect: (node: LifeMapNode) => void;
}) {`,
)

replaceOnce(
  adaptive,
  `
      {selected ? (
        <Html distanceFactor={8.2} position={[0, -scale * 1.48, 0.16]} center zIndexRange={[90, 30]}>
          <div className="life-map-memory-portals" onPointerDown={(event) => event.stopPropagation()}>
            <button type="button" onClick={() => onEnterFocus(node)}>Enter Focus</button>
            <button type="button" onClick={() => onEnterReplay(node)} disabled={!node.replayAvailable || node.locked}>Replay</button>
            <button type="button" onClick={onOverview}>Overview</button>
          </div>
        </Html>
      ) : null}`,
  '',
)

replaceOnce(
  adaptive,
  `function LifeMapWorld({ nodes, selectedNode, profile, cameraIntent, onSelect, onEnterFocus, onEnterReplay, onOverview }: {
  nodes: LifeMapNode[];
  selectedNode: LifeMapNode | null;
  profile: SpatialQualityProfile;
  cameraIntent: CameraIntent;
  onSelect: (node: LifeMapNode) => void;
} & MemoryPortalHandlers) {`,
  `function LifeMapWorld({ nodes, selectedNode, profile, cameraIntent, onSelect }: {
  nodes: LifeMapNode[];
  selectedNode: LifeMapNode | null;
  profile: SpatialQualityProfile;
  cameraIntent: CameraIntent;
  onSelect: (node: LifeMapNode) => void;
}) {`,
)

replaceOnce(
  adaptive,
  `            profile={profile}
            onSelect={onSelect}
            onEnterFocus={onEnterFocus}
            onEnterReplay={onEnterReplay}
            onOverview={onOverview}
          />`,
  `            profile={profile}
            onSelect={onSelect}
          />`,
)

replaceOnce(
  adaptive,
  `        <LifeMapWorld
          nodes={nodes}
          selectedNode={selectedNode}
          profile={profile}
          cameraIntent={cameraIntent}
          onSelect={selectNode}
          onEnterFocus={enterFocus}
          onEnterReplay={enterReplay}
          onOverview={recenter}
        />
      </Canvas>

      <div className="life-map-realm-mark" aria-hidden="true">`,
  `        <LifeMapWorld
          nodes={nodes}
          selectedNode={selectedNode}
          profile={profile}
          cameraIntent={cameraIntent}
          onSelect={selectNode}
        />
      </Canvas>

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
)

const css = 'urai-tier1/src/spatial/world/lifeMapSelectedCinematic.css'
replaceOnce(
  css,
  `.life-map-independent-realm[data-life-map-mode='selected'] .life-map-memory-portals {
  position: relative;
  z-index: 90;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  width: min(560px, calc(100vw - 40px));
  max-width: min(560px, calc(100vw - 40px));
  box-sizing: border-box;
  transform: translateY(clamp(-230px, -22vh, -145px));
  transform-origin: center;
}`,
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
)
replaceOnce(
  css,
  `  .life-map-independent-realm[data-life-map-mode='selected'] .life-map-memory-portals {
    gap: 4px;
    width: calc(100vw - 24px);
    max-width: calc(100vw - 24px);
    padding: 5px;
    transform: translateY(clamp(-145px, -16vh, -96px));
  }`,
  `  .life-map-independent-realm[data-life-map-mode='selected'] .life-map-memory-portals {
    left: max(12px, env(safe-area-inset-left));
    right: max(12px, env(safe-area-inset-right));
    top: clamp(400px, 62svh, 590px);
    gap: 4px;
    width: auto;
    max-width: none;
    padding: 5px;
    transform: none;
  }`,
)

const deepLink = 'urai-tier1/tests/lifemap-deep-link-controls-contract.test.mjs'
replaceOnce(
  deepLink,
  `  assert.match(adaptive, /className="life-map-memory-portals"/)
  assert.match(adaptive, /onClick=\{\(\) => onEnterFocus\(node\)\}/)
  assert.match(adaptive, /onClick=\{\(\) => onEnterReplay\(node\)\}/)`,
  `  assert.match(adaptive, /className="life-map-memory-portals"/)
  assert.match(adaptive, /data-life-map-selected-actions-owner="route-dom-overlay"/)
  assert.match(adaptive, /onClick=\{\(\) => enterFocus\(selectedNode\)\}/)
  assert.match(adaptive, /onClick=\{\(\) => enterReplay\(selectedNode\)\}/)
  assert.doesNotMatch(adaptive, /<Html[\s\S]*life-map-memory-portals/)`,
)
replaceOnce(
  deepLink,
  `  assert.match(selectedCinematic, /width: min\(560px, calc\(100vw - 40px\)\)/)
  assert.match(selectedCinematic, /max-width: min\(560px, calc\(100vw - 40px\)\)/)
  assert.match(selectedCinematic, /translateY\(clamp\(-230px, -22vh, -145px\)\)/)
  assert.match(selectedCinematic, /min-height: 52px/)
  assert.match(selectedCinematic, /@media \(max-width: 760px\)[\s\S]*width: calc\(100vw - 24px\)/)
  assert.match(selectedCinematic, /@media \(max-width: 760px\)[\s\S]*max-width: calc\(100vw - 24px\)/)
  assert.match(selectedCinematic, /@media \(max-width: 760px\)[\s\S]*translateY\(clamp\(-145px, -16vh, -96px\)\)/)
  assert.match(selectedCinematic, /@media \(max-width: 760px\)[\s\S]*min-height: 48px/)`,
  `  assert.match(adaptive, /data-life-map-selected-actions-owner="route-dom-overlay"/)
  assert.doesNotMatch(adaptive, /<Html[\s\S]*life-map-memory-portals/)
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
  assert.match(selectedCinematic, /@media \(max-width: 760px\)[\s\S]*min-height: 48px/)`,
)

const finalContract = 'urai-tier1/tests/final-aaa-world-convergence-contract.test.mjs'
replaceOnce(
  finalContract,
  `  assert.match(lifeMapSelectedCinematic, /width: min\(560px, calc\(100vw - 40px\)\)/)
  assert.match(lifeMapSelectedCinematic, /transform: translateY\(clamp\(-230px, -22vh, -145px\)\)/)
  assert.match(lifeMapSelectedCinematic, /@media \(max-width: 760px\)[\s\S]*width: calc\(100vw - 24px\)/)
  assert.match(lifeMapSelectedCinematic, /@media \(max-width: 760px\)[\s\S]*min-height: 48px/)`,
  `  assert.match(adaptiveLifeMap, /data-life-map-selected-actions-owner="route-dom-overlay"/)
  assert.doesNotMatch(adaptiveLifeMap, /<Html[\s\S]*life-map-memory-portals/)
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
  assert.match(lifeMapSelectedCinematic, /@media \(max-width: 760px\)[\s\S]*min-height: 48px/)`,
)

console.log('Applied route-owned selected-memory action overlay repair')
