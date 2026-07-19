import fs from 'node:fs'

const replaceOnce = (path, before, after) => {
  const source = fs.readFileSync(path, 'utf8')
  const first = source.indexOf(before)
  if (first < 0) throw new Error(`Expected source not found in ${path}: ${before.slice(0, 120)}`)
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`Expected unique source duplicated in ${path}`)
  fs.writeFileSync(path, source.slice(0, first) + after + source.slice(first + before.length))
}

const adaptive = 'urai-tier1/src/components/lifemap/AdaptiveLifeMapScene.tsx'
replaceOnce(
  adaptive,
  `        <div>\n          <p>Explore memories without the visual field.</p>\n          {nodes.map((node) => (\n            <button key={node.id} type="button" onClick={() => selectNode(node)}>\n              {node.title}: {node.summary}\n            </button>\n          ))}\n          {selectedNode ? (\n            <>\n              <button type="button" onClick={() => router.push(identityHref("focus", selectedNode))}>Enter Focus</button>\n              <button type="button" onClick={() => router.push(identityHref("replay", selectedNode))} disabled={!selectedNode.replayAvailable || selectedNode.locked}>Replay</button>\n            </>\n          ) : null}\n          <button type="button" data-life-map-overview-control="true" onClick={recenter}>Overview</button>\n          <button type="button" onClick={() => router.push("/ground")}>Ground</button>\n          <button type="button" onClick={() => router.push("/home")}>Home</button>\n        </div>`,
  `        <div>\n          <div data-life-map-overview-list="true">\n            <p>Explore memories without the visual field.</p>\n            {nodes.map((node) => (\n              <button key={node.id} type="button" onClick={() => selectNode(node)}>\n                {node.title}: {node.summary}\n              </button>\n            ))}\n          </div>\n          {selectedNode ? (\n            <div data-life-map-selected-actions="true">\n              <button type="button" onClick={() => router.push(identityHref("focus", selectedNode))}>Enter Focus</button>\n              <button type="button" onClick={() => router.push(identityHref("replay", selectedNode))} disabled={!selectedNode.replayAvailable || selectedNode.locked}>Replay</button>\n            </div>\n          ) : null}\n          <div data-life-map-route-actions="true">\n            <button type="button" data-life-map-overview-control="true" onClick={recenter}>Overview</button>\n            <button type="button" onClick={() => router.push("/ground")}>Ground</button>\n            <button type="button" onClick={() => router.push("/home")}>Home</button>\n          </div>\n        </div>`,
)

const selectedCss = 'urai-tier1/src/spatial/world/lifeMapSelectedCinematic.css'
replaceOnce(
  selectedCss,
  `.life-map-independent-realm[data-life-map-mode='selected'] .life-map-accessibility-menu > div {\n  display: none !important;\n}`,
  `.life-map-accessibility-menu [data-life-map-overview-list='true'],\n.life-map-accessibility-menu [data-life-map-selected-actions='true'],\n.life-map-accessibility-menu [data-life-map-route-actions='true'] {\n  display: grid;\n  gap: 7px;\n}\n\n.life-map-independent-realm[data-life-map-mode='selected']\n  .life-map-accessibility-menu [data-life-map-overview-list='true'] {\n  display: none !important;\n}`,
)

const audit = 'scripts/run-live-visual-audit-current.mjs'
replaceOnce(
  audit,
  `        const semanticList = document.querySelector('details.life-map-accessibility-menu > div')`,
  `        const semanticList = document.querySelector("details.life-map-accessibility-menu [data-life-map-overview-list='true']")`,
)

const ground = 'urai-tier1/src/app/GroundSpatialWorldClean.tsx'
replaceOnce(
  ground,
  `.ground-destination-compass{justify-content:flex-start;bottom:max(10px,env(safe-area-inset-bottom));gap:5px}`,
  `.ground-destination-compass{justify-content:flex-start;bottom:max(10px,env(safe-area-inset-bottom));gap:5px;padding-inline:12px 210px;scroll-padding-inline:12px 210px}`,
)

const deepLinkContract = 'urai-tier1/tests/lifemap-deep-link-controls-contract.test.mjs'
replaceOnce(
  deepLinkContract,
  `  assert.match(selectedCinematic, /data-life-map-mode='selected'[\\s\\S]*\\.life-map-accessibility-menu > div[\\s\\S]*display: none !important/)`,
  `  assert.match(adaptive, /data-life-map-overview-list="true"/)\n  assert.match(adaptive, /data-life-map-selected-actions="true"/)\n  assert.match(adaptive, /data-life-map-route-actions="true"/)\n  assert.match(selectedCinematic, /data-life-map-mode='selected'[\\s\\S]*data-life-map-overview-list='true'[\\s\\S]*display: none !important/)\n  assert.doesNotMatch(selectedCinematic, /data-life-map-mode='selected'[\\s\\S]*\\.life-map-accessibility-menu > div[\\s\\S]*display: none !important/)`,
)

const finalContract = 'urai-tier1/tests/final-aaa-world-convergence-contract.test.mjs'
replaceOnce(
  finalContract,
  `  assert.match(lifeMapSelectedCinematic, /data-life-map-mode='selected'[\\s\\S]*\\.life-map-accessibility-menu > div[\\s\\S]*display: none !important/)`,
  `  assert.match(adaptiveLifeMap, /data-life-map-overview-list="true"/)\n  assert.match(adaptiveLifeMap, /data-life-map-selected-actions="true"/)\n  assert.match(lifeMapSelectedCinematic, /data-life-map-mode='selected'[\\s\\S]*data-life-map-overview-list='true'[\\s\\S]*display: none !important/)\n  assert.doesNotMatch(lifeMapSelectedCinematic, /data-life-map-mode='selected'[\\s\\S]*\\.life-map-accessibility-menu > div[\\s\\S]*display: none !important/)`,
)

const doorwayContract = 'urai-tier1/tests/persistent-world-doorway-regression.test.mjs'
replaceOnce(
  doorwayContract,
  `  assert.match(finalCss, /height: 96px !important/)\n  assert.match(worldNavigation, /@media \\(max-width: 700px\\)[\\s\\S]*\\.urai-ground-gateway__surface[\\s\\S]*bottom: max\\(72px, calc\\(env\\(safe-area-inset-bottom\\) \\+ 64px\\)\\)/)`,
  `  assert.match(finalCss, /height: 96px !important/)\n  assert.match(worldNavigation, /@media \\(max-width: 700px\\)[\\s\\S]*\\.urai-ground-gateway__surface[\\s\\S]*bottom: max\\(72px, calc\\(env\\(safe-area-inset-bottom\\) \\+ 64px\\)\\)/)\n  assert.match(read('src/app/GroundSpatialWorldClean.tsx'), /padding-inline:12px 210px;scroll-padding-inline:12px 210px/)`,
)

console.log('Applied final accessibility ownership repair')
