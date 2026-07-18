import fs from 'node:fs'
const capture='scripts/capture-continuous-spatial-proof.mjs'
const sceneTest='urai-tier1/tests/lifemap-scene-behavior.test.mjs'
const controlsTest='urai-tier1/tests/lifemap-deep-link-controls-contract.test.mjs'
const read=(p)=>fs.readFileSync(p,'utf8'),write=(p,v)=>fs.writeFileSync(p,v)
function once(p,a,b){const s=read(p),i=s.indexOf(a);if(i<0||s.indexOf(a,i+a.length)>=0)throw new Error(`source ${a}`);write(p,s.slice(0,i)+b+s.slice(i+a.length))}

once(capture,"    path: '/life-map/',","    path: '/life-map/?demo=1',")
once(capture,"    path: '/life-map/?memoryId=quiet-reset&manifestId=replay-recovery-thread&node=quiet-reset',","    path: '/life-map/?memoryId=quiet-reset&manifestId=replay-recovery-thread&node=quiet-reset&demo=1',")
once(sceneTest,"assert.ok(source.includes('useLifeMapEvents()'), 'Life Map must load private or explicit sample-backed memory nodes.')","assert.ok(source.includes('useLifeMapEvents(requestedDemo ? \"demo-user\" : undefined)'), 'Life Map must keep private loading by default and enable sample nodes only for explicit demo URLs.')")
once(sceneTest,"assert.ok(canonical.includes('data-life-map-authored-universe=\"primary\"'), 'The authored galaxy must remain an explicit visible owner.')","assert.ok(canonical.includes('data-life-map-authored-universe=\"atmospheric\"'), 'The governed provider art must remain only an atmospheric owner.')")
once(sceneTest,"assert.ok(canonical.includes('opacity: .78'), 'The authored universe must not regress to a nearly invisible decorative tint.')","assert.ok(canonical.includes('opacity: .22'), 'The provider art must remain atmospheric rather than veiling the R3F world.')")
const source=read(sceneTest),marker="test('LifeMap depth composition contains no block or plane veil owners'"
if(source.includes(marker))throw new Error('depth contract exists')
const contract=[
"test('LifeMap depth composition contains no block or plane veil owners', () => {",
"  const goalStart = source.indexOf('function GoalMonuments')",
"  const goalEnd = source.indexOf('function PrivateVaults', goalStart)",
"  const vaultEnd = source.indexOf('function EmotionalWeather', goalEnd)",
"  const weatherEnd = source.indexOf('function MemoryPath', vaultEnd)",
"  const crossingStart = source.indexOf('function ForegroundDepthCrossings')",
"  const crossingEnd = source.indexOf('function LifeMapWorld', crossingStart)",
"  const structuralField = source.slice(goalStart, weatherEnd) + source.slice(crossingStart, crossingEnd)",
"  assert.match(structuralField, /life-map-far-goal-beacons/)",
"  assert.match(structuralField, /life-map-private-vault-arc/)",
"  assert.match(structuralField, /life-map-near-crossing-thread/)",
"  assert.match(structuralField, /pointsMaterial/)",
"  assert.doesNotMatch(structuralField, /boxGeometry|planeGeometry/)",
"  assert.match(source, /const requestedDemo = params.get\\(\"demo\"\\) === \"1\"/)",
"  assert.match(source, /useLifeMapEvents\\(requestedDemo \\? \"demo-user\" : undefined\\)/)",
"  assert.match(canonical, /opacity: \\.22/)",
"  assert.match(canonical, /brightness\\(\\.68\\)/)",
"})",
].join('\n')
write(sceneTest,`${source.trimEnd()}\n\n${contract}\n`)
once(controlsTest,"assert.match(css, /width: min\\(320px, calc\\(100vw - 40px\\)\\)/)","assert.match(css, /width: min\\(820px, calc\\(100vw - 300px\\)\\)/)")
once(controlsTest,"assert.match(css, /min-height: 38px/)","assert.match(css, /min-height: 48px/)")
once(controlsTest,"assert.match(css, /@media \\(max-width: 760px\\)/)","assert.match(css, /@media \\(max-width: 760px\\)/)\n  assert.match(css, /border-radius: 999px/)\n  assert.match(css, /backdrop-filter: blur\\(14px\\)/)")
