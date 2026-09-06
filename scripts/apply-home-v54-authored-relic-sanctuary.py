from pathlib import Path
import re

SOURCE = Path('urai-tier1/src/spatial/layout/HomeWorldProductionFinal.tsx')
REALISM = Path('urai-tier1/tests/home-relic-machine-realism-contract.test.mjs')
PORTAL_PROOF = Path('scripts/capture-natural-home-orb-proof.mjs')
CONTINUOUS_PROOF = Path('scripts/run-continuous-spatial-proof-v22-natural.mjs')
HOME_STATE = Path('scripts/capture-home-state-proof.mjs')

text = SOURCE.read_text()


def replace_function(start_name: str, next_name: str, replacement: str) -> None:
    global text
    pattern = rf"function {re.escape(start_name)}\b[\s\S]*?(?=\nfunction {re.escape(next_name)}\b)"
    text, count = re.subn(pattern, replacement.rstrip() + "\n\n", text, count=1)
    if count != 1:
        raise SystemExit(f'expected exactly one {start_name} -> {next_name} function span, got {count}')


def replace_exact(value: str, old: str, new: str, expected: int = 1, label: str = 'replacement') -> str:
    count = value.count(old)
    if count != expected:
        raise SystemExit(f'{label}: expected {expected} occurrence(s), got {count}')
    return value.replace(old, new, expected)


if 'v54-authored-relic-sanctuary-retained-pixel-rebuild' in text:
    print('V54 authored relic sanctuary already materialized')
    raise SystemExit(0)
if 'v53-integrated-arch-reliquary-retained-pixel-rebuild' not in text:
    raise SystemExit('expected V53 source marker was not found')

replace_function('cloneOrbModel', 'PouredStone', r'''function cloneOrbModel(source: THREE.Object3D) {
  const root = cloneModel(source)
  root.visible = true
  root.traverse((object) => {
    const retiredDisplay = object.name === 'orb-aura' || object.name.startsWith('orb-orbit-') || object.name.startsWith('orb-filament-') || object.name.startsWith('orb-petal-')
    if (retiredDisplay) {
      object.visible = false
      object.userData.uraiRetiredVisualRole = 'v54-no-aura-no-orbits-no-starburst-no-petal-display-language'
      return
    }
    if (object.name === 'orb-core') {
      object.visible = true
      object.scale.multiplyScalar(0.72)
      object.userData.uraiIntegratedVisualRole = 'v54-authored-core-primary-visible-machine-heart'
    }
    if (object.name === 'orb-heart') {
      object.visible = true
      object.scale.multiplyScalar(0.9)
      object.userData.uraiIntegratedVisualRole = 'v54-authored-heart-primary-visible-machine-heart'
    }
    if (!(object instanceof THREE.Mesh)) return
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    for (const material of materials) {
      if (!(material instanceof THREE.MeshStandardMaterial)) continue
      material.color.lerp(new THREE.Color('#31564d'), 0.42)
      material.emissive.lerp(new THREE.Color('#7fc8bb'), 0.1)
      material.emissiveIntensity = Math.min(Math.max(material.emissiveIntensity, 0.015), 0.09)
      material.roughness = Math.max(material.roughness, 0.6)
      material.metalness = Math.min(Math.max(material.metalness, 0.34), 0.6)
      material.envMapIntensity = Math.min(Math.max(material.envMapIntensity, 0.48), 0.72)
      if (material instanceof THREE.MeshPhysicalMaterial) {
        material.transmission = 0
        material.thickness = 0
        material.opacity = 1
        material.transparent = false
      }
      material.needsUpdate = true
    }
  })
  root.userData.uraiTreatment = 'v54-governed-authored-orb-primary-no-synthetic-polyhedron-shell'
  return root
}''')

replace_function('SanctuaryCourt', 'ProductionSanctuary', r'''function SanctuaryCourt({ target }: { target: MutableRefObject<THREE.Vector3 | null> }) {
  const sanctuary = useGLTF(SANCTUARY)
  const compatibilityModel = useMemo(() => cloneCompatibilitySanctuary(sanctuary.scene), [sanctuary.scene])
  const pack = useStonePack(0.24, 0.3)
  const onWalk = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (useSceneStore.getState().inputLocked) return
    target.current = new THREE.Vector3(THREE.MathUtils.clamp(event.point.x, BOUNDS.minX, BOUNDS.maxX), 0, THREE.MathUtils.clamp(event.point.z, BOUNDS.minZ, BOUNDS.maxZ))
  }
  return <group name="home-authored-terrain" userData={{ treatment: 'v54-finished-processional-floor-with-dark-shoulders-and-integrated-machine-seams', source: HOME_PHOTOGRAPHIC_PBR_V19 }}>
    <primitive object={compatibilityModel} />
    <mesh name="home-v48-walkable-photographic-floor" position={[0,-0.16,-1.65]} rotation={[-Math.PI/2,0,0]} receiveShadow>
      <planeGeometry args={[14.2,18.0,24,32]} />
      <meshPhysicalMaterial color="#242d29" map={pack.color} normalMap={pack.normal} normalScale={new THREE.Vector2(0.13,0.13)} roughnessMap={pack.arm} displacementMap={pack.displacement} displacementScale={0.003} displacementBias={-0.0014} roughness={0.78} metalness={0.012} clearcoat={0.022} clearcoatRoughness={0.82} envMapIntensity={0.8} />
    </mesh>
    <mesh name="home-v54-central-finished-stone-lane" position={[0,-0.125,-3.25]} rotation={[-Math.PI/2,0,0]} receiveShadow userData={{treatment:'v54-narrow-finished-processional-lane-reduces-raw-floor-acreage'}}>
      <planeGeometry args={[6.8,11.8,12,18]} />
      <meshPhysicalMaterial color="#38443e" map={pack.color} normalMap={pack.normal} normalScale={new THREE.Vector2(0.07,0.07)} roughnessMap={pack.arm} roughness={0.67} metalness={0.02} clearcoat={0.05} clearcoatRoughness={0.74} envMapIntensity={0.88} />
    </mesh>
    <group name="home-v54-floor-shoulders" userData={{treatment:'v54-dark-side-shoulders-frame-processional-lane-without-platform-or-grid'}}>
      <mesh position={[-4.72,-0.118,-3.05]} rotation={[-Math.PI/2,0,-0.015]} receiveShadow><planeGeometry args={[2.2,12.4]}/><meshStandardMaterial color="#18211e" roughness={0.84} metalness={0.08}/></mesh>
      <mesh position={[4.65,-0.118,-3.3]} rotation={[-Math.PI/2,0,0.018]} receiveShadow><planeGeometry args={[2.15,12.1]}/><meshStandardMaterial color="#211f1a" roughness={0.84} metalness={0.08}/></mesh>
      <mesh position={[-1.72,-0.092,-6.15]} rotation={[-Math.PI/2,0,-0.08]} receiveShadow><planeGeometry args={[0.045,6.2]}/><meshStandardMaterial color="#668d82" emissive="#17362f" emissiveIntensity={0.08} roughness={0.62} metalness={0.28}/></mesh>
      <mesh position={[1.8,-0.092,-6.18]} rotation={[-Math.PI/2,0,0.08]} receiveShadow><planeGeometry args={[0.045,6.0]}/><meshStandardMaterial color="#907b58" emissive="#362719" emissiveIntensity={0.07} roughness={0.64} metalness={0.26}/></mesh>
    </group>
    <mesh name="home-walkable-navigation-surface" position={[0,0.18,-1.45]} rotation={[-Math.PI/2,0,0]} onClick={onWalk}>
      <planeGeometry args={[13.0,17.0]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
    </mesh>
  </group>
}''')

replace_function('ContinuousVaultSkin', 'CantedWallMass', r'''function ContinuousVaultSkin({pack}:{pack:SurfacePack}){
  return <group name="home-v47-reliquary-apse" userData={{treatment:'v54-single-sculpted-rear-shell-with-asymmetric-side-returns-no-torus-tunnel-no-scaffold'}}>
    <SanctuaryShellMass pack={pack} position={[0,2.72,-10.7]} width={10.6} height={6.5} depth={1.18} openingWidth={7.15} openingHeight={4.75} color="#27332f"/>
    <ArchedMass pack={pack} position={[-5.45,.15,-7.1]} rotation={[0,1.42,0]} width={4.6} height={4.9} depth={0.62} openingWidth={2.65} openingHeight={3.45} color="#202b27" accent="#48675f"/>
    <ArchedMass pack={pack} position={[5.25,.1,-7.55]} rotation={[0,-1.38,0]} width={4.35} height={4.65} depth={0.7} openingWidth={2.5} openingHeight={3.25} color="#332f27" accent="#75654d"/>
  </group>
}''')

replace_function('MachineCavityLiner', 'SanctuarySideGallery', r'''function MachineCavityLiner(){
  return <group name="home-v47-reliquary-cavity" userData={{treatment:'v54-recessed-back-machine-seat-with-broad-load-shoulders-no-ring-no-box-housing'}}>
    <TaperedLoadBeam from={[-3.05,3.35,-10.02]} to={[-1.52,2.72,-6.18]} width={.28} color="#30483f"/>
    <TaperedLoadBeam from={[2.92,3.2,-10.18]} to={[1.42,2.68,-6.2]} width={.28} color="#5b4d39"/>
    <TaperedLoadBeam from={[-2.7,.55,-9.96]} to={[-1.45,1.6,-6.08]} width={.22} color="#263b35"/>
    <TaperedLoadBeam from={[2.62,.48,-10.12]} to={[1.36,1.58,-6.12]} width={.22} color="#4b4031"/>
    <pointLight position={[0,2.7,-8.45]} color="#83c9bc" intensity={.82} distance={7.2} decay={2}/>
  </group>
}''')

replace_function('SanctuarySideGallery', 'SanctuaryArchitecture', r'''function SanctuarySideGallery(){
  const pack=useStonePack(.48,.68)
  return <group name="home-v47-side-gallery" userData={{treatment:'v54-two-asymmetric-side-alcoves-and-integrated-practicals-no-bollards-no-repeated-bays'}}>
    <ArchedMass pack={pack} position={[-5.78,.08,-2.75]} rotation={[0,1.5,0]} width={4.1} height={4.25} depth={0.62} openingWidth={2.3} openingHeight={3.0} color="#1d2824" accent="#405f57"/>
    <ArchedMass pack={pack} position={[5.62,.06,-3.5]} rotation={[0,-1.46,0]} width={4.45} height={4.55} depth={0.68} openingWidth={2.55} openingHeight={3.2} color="#312d25" accent="#6d5e49"/>
    <RecessedPractical position={[-4.72,.17,-4.55]} warm={false}/><RecessedPractical position={[4.62,.17,-5.1]}/>
    <pointLight position={[-4.55,1.55,-5.15]} color="#719f96" intensity={.46} distance={5.8} decay={2}/>
    <pointLight position={[4.45,1.5,-5.55]} color="#b99667" intensity={.44} distance={5.8} decay={2}/>
  </group>
}''')

replace_function('SanctuaryArchitecture', 'SanctuaryGlazing', r'''function SanctuaryArchitecture(){const pack=useStonePack(.36,.52);return <group name="home-sanctuary-pavilion" userData={{visualOwner:'cinematic-authored-relic-sanctuary-v54',construction:'single-sculpted-rear-shell-asymmetric-side-alcoves-recessed-machine-seat-and-governed-authored-orb',visualTreatment:'v54-authored-relic-sanctuary-retained-pixel-rebuild'}}>
  <SanctuarySideGallery/>
  <ContinuousVaultSkin pack={pack}/>
  <MachineCavityLiner/>
  <group name="home-v54-perspective-practicals" userData={{treatment:'v54-recessed-depth-lights-frame-sanctuary-not-display-object'}}>
    <RecessedPractical position={[-3.45,.18,-8.35]} warm={false}/><RecessedPractical position={[3.32,.18,-8.62]}/>
  </group>
</group>}''')

replace_function('ReliquaryWing', 'CrownBridge', r'''function ReliquaryWing({side}:{side:-1|1}){
  const s=side
  return <group name={side<0?'home-v47-left-load-arm':'home-v47-right-load-arm'} userData={{treatment:'v54-rear-mounted-load-shoulder-no-floor-leg-no-clamp-display'}}>
    <RoundedBox args={[1.18,.34,.62]} radius={.1} smoothness={5} position={[s*1.34,2.26,-5.82]} rotation={[0,s*.18,s*.16]} castShadow receiveShadow>
      <meshPhysicalMaterial color={side<0?'#35544b':'#685940'} roughness={.58} metalness={.48} clearcoat={.04} clearcoatRoughness={.68}/>
    </RoundedBox>
  </group>
}''')

replace_function('OrbCradle', 'MachineCoreAssembly', r'''function OrbCradle(){return <group name="home-orb-engineered-cradle" userData={{treatment:'v54-wall-integrated-rear-shoulder-cradle-no-pedestal-no-four-floor-legs'}}>
  <ReliquaryWing side={-1}/><ReliquaryWing side={1}/><CrownBridge/>
  <RoundedBox args={[1.9,.28,.58]} radius={.09} smoothness={5} position={[0,1.08,-5.78]} castShadow receiveShadow>
    <meshPhysicalMaterial color="#283a34" roughness={.62} metalness={.44} clearcoat={.03} clearcoatRoughness={.72}/>
  </RoundedBox>
</group>}''')

replace_function('MachineCoreAssembly', 'OrbArmorPlate', r'''function MachineCoreAssembly(){
  return <group name="home-v47-machine-core-assembly" userData={{treatment:'v54-rear-wall-load-paths-frame-authored-orb-without-ring-collar-or-display-plate'}}>
    <TaperedLoadBeam from={[-2.28,3.05,-6.32]} to={[-1.08,2.6,-5.62]} width={.2} color="#3b5c52"/>
    <TaperedLoadBeam from={[2.24,2.98,-6.34]} to={[1.06,2.58,-5.62]} width={.2} color="#695941"/>
    <TaperedLoadBeam from={[-1.92,1.0,-6.3]} to={[-1.02,1.62,-5.58]} width={.17} color="#30483f"/>
    <TaperedLoadBeam from={[1.9,.96,-6.32]} to={[1.0,1.6,-5.58]} width={.17} color="#564936"/>
    <pointLight position={[0,2.36,-6.1]} color="#88d0c2" intensity={.84} distance={5.6} decay={2}/>
  </group>
}''')

replace_function('SacredOrb', 'HumanPresence', r'''function SacredOrb({state,reducedMotion,onOpen}:{state:OrbState;reducedMotion:boolean;onOpen:()=>void}){
  const root=useRef<THREE.Group>(null),activeAction=useRef<THREE.AnimationAction|null>(null)
  const orb=useGLTF(ORB_MODEL)
  const authoredOrb=useMemo(()=>cloneOrbModel(orb.scene),[orb.scene])
  const {actions}=useAnimations(orb.animations,authoredOrb)
  const sensory=useMemo(()=>resolveOrbSensoryOutput(state,reducedMotion,true),[state,reducedMotion])
  useEffect(()=>{const allActions=Object.values(actions).filter((action):action is THREE.AnimationAction=>Boolean(action));if(reducedMotion){allActions.forEach((action)=>action.stop());activeAction.current=null;return}const next=actions[ORB_CLIPS[state]];if(!next)return;const previous=activeAction.current;if(previous&&previous!==next)previous.fadeOut(.2);next.reset().setLoop(THREE.LoopRepeat,Infinity).fadeIn(.2).play();activeAction.current=next},[actions,reducedMotion,state])
  useEffect(()=>()=>{Object.values(actions).forEach((action)=>action?.stop())},[actions])
  useFrame(({clock})=>{if(!root.current)return;root.current.rotation.y=reducedMotion?0:Math.sin(clock.elapsedTime*.12)*.006;root.current.position.y=ORB.y+(reducedMotion?0:Math.sin(clock.elapsedTime*.3)*.008)})
  const stateColor=state==='warning'?'#d0a06e':state==='thinking'||state==='reflecting'?'#a4b3d6':'#8ce0d4'
  const intensity=state==='speaking'?1.2:state==='listening'?1.1:1.0
  return <group ref={root} name="home-orb-sanctuary" position={ORB} onClick={(event)=>{event.stopPropagation();onOpen()}} userData={{orbState:state,animation:sensory.animation,modelClip:ORB_CLIPS[state],runtimeAsset:ORB_MODEL,treatment:'v54-governed-authored-orb-is-primary-visible-relic-machine-no-polyhedron-shell-no-starburst-no-glass-sphere'}}>
    <group scale={1.24} position={[0,0,.04]} rotation={[0,.16,0]} name="home-orb-authored-core" userData={{treatment:'v54-governed-authored-orb-primary-visible-body-inside-wall-integrated-machine-seat'}}><primitive object={authoredOrb}/></group>
    <pointLight color={stateColor} intensity={intensity*1.28} distance={8.4} decay={2}/>
    <pointLight position={[0,.32,-1.12]} color="#d2b477" intensity={.42} distance={4.8} decay={2}/>
  </group>
}''')

text = replace_exact(text, 'cinematic-pbr-v53-integrated-arch-reliquary', 'cinematic-pbr-v54-authored-relic-sanctuary', 1, 'visual grade')
text = replace_exact(text, 'v53-integrated-arch-reliquary-candidate', 'v54-authored-relic-sanctuary-candidate', 1, 'art revision')
text = replace_exact(text, 'v53-retained-pixel-candidate-not-certified', 'v54-retained-pixel-candidate-not-certified', 1, 'art certification')
text = replace_exact(text, 'integrated-arch-v53-plus-governed-living-orb', 'authored-relic-v54-plus-governed-living-orb', 1, 'animation owner')
text = replace_exact(text, 'pitch=useRef(0.19)', 'pitch=useRef(0.26)', 1, 'camera pitch initializer')
text = replace_exact(text, 'pitch.current=0.19', 'pitch.current=0.26', 1, 'camera pitch reset')
text = replace_exact(text, 'const desiredFov=portrait?48:42', 'const desiredFov=portrait?54:48', 1, 'camera FOV')
text = replace_exact(text, "cosmic?0.0022:0.0058", "cosmic?0.0022:0.0038", 1, 'non-cosmic fog density')

if 'v54-authored-relic-sanctuary-retained-pixel-rebuild' not in text:
    raise SystemExit('V54 marker missing after materialization')
SOURCE.write_text(text)

home_state = HOME_STATE.read_text()
home_state = replace_exact(home_state, "record.visibleWorld === 'moonlit-sacred-tech-sanctuary'", "record.visibleWorld === 'open-air-sacred-tech-reliquary'", 1, 'Home State current visible world')
home_state = replace_exact(home_state, "const record = { id, pageErrors, passed: false, reducedMotion }\n  try {", """const record = { id, pageErrors, passed: false, reducedMotion }\n  const fixtureRequests = []\n  record.fixtureRequests = fixtureRequests\n  await page.route('**/api/orb-companion', async (route) => {\n    const request = route.request()\n    if (request.method() !== 'POST') return route.continue()\n    let payload = {}\n    try { payload = request.postDataJSON() || {} } catch {}\n    fixtureRequests.push({ message: payload?.message ?? null, userId: payload?.userId ?? null })\n    await route.fulfill({\n      status: 200,\n      contentType: 'application/json',\n      body: JSON.stringify({\n        ok: true, service: 'urai-spatial', userId: 'adamclamp', userIdSource: 'default-demo',\n        identityMode: 'public-demo', reply: 'URAI Spatial proof fixture: grounded reflection complete.',\n        mode: 'local-fallback', confidenceLabel: 'fallback', isDemoFallback: true, sources: [],\n      }),\n    })\n  })\n  try {""", 1, 'Home State deterministic orb route fixture')
home_state = replace_exact(home_state, "await openOrb.click()", "await openOrb.click({ noWaitAfter: true })", 1, 'Home State Orb open deterministic click')
home_state = replace_exact(home_state, "await page.getByRole('button', { name: 'Send' }).click()", "await page.getByRole('button', { name: 'Send' }).click({ noWaitAfter: true })", 1, 'Home State send deterministic click')
home_state = replace_exact(home_state, "&& record.lifecyclePassed\n      && record.visual?.available === true", "&& record.lifecyclePassed\n      && record.fixtureRequests.length === 1\n      && record.fixtureRequests[0]?.message === 'Give me a short grounded reflection.'\n      && record.visual?.available === true", 1, 'Home State fixture request assertion')
HOME_STATE.write_text(home_state)

REALISM.write_text(r'''import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import test from 'node:test'

const source = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionFinal.tsx', import.meta.url), 'utf8')
const homeState = readFileSync(new URL('../../scripts/capture-home-state-proof.mjs', import.meta.url), 'utf8')
const provenancePath = new URL('../../operations/assets/home-v48-production-asset-provenance.json', import.meta.url)
const provenance = JSON.parse(readFileSync(provenancePath, 'utf8'))
const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url))
const sceneStart = source.indexOf('function SacredFinalScene(')
const sceneEnd = source.indexOf('export function HomeWorldProductionFinal', sceneStart)
const sceneSource = source.slice(sceneStart, sceneEnd)
const vaultSource = source.slice(source.indexOf('function ContinuousVaultSkin'), source.indexOf('function CantedWallMass'))
const gallerySource = source.slice(source.indexOf('function SanctuarySideGallery'), source.indexOf('function SanctuaryArchitecture'))
const orbStart = source.indexOf('function SacredOrb(')
const orbEnd = source.indexOf('function HumanPresence', orbStart)
const orbSource = source.slice(orbStart, orbEnd)

test('V54 removes V53 torus tunnel and bollard composition in favor of one sculpted rear shell plus asymmetric side alcoves', () => {
  assert.match(source,/v54-authored-relic-sanctuary-retained-pixel-rebuild/)
  assert.match(source,/visualOwner:'cinematic-authored-relic-sanctuary-v54'/)
  assert.match(vaultSource,/v54-single-sculpted-rear-shell-with-asymmetric-side-returns-no-torus-tunnel-no-scaffold/)
  assert.match(gallerySource,/v54-two-asymmetric-side-alcoves-and-integrated-practicals-no-bollards-no-repeated-bays/)
  assert.doesNotMatch(vaultSource,/torusGeometry/)
  assert.doesNotMatch(gallerySource,/cylinderGeometry/)
  assert.match(sceneSource,/<SanctuaryArchitecture \/>/)
  assert.match(sceneSource,/<ProductionSanctuary \/>/)
})

test('V54 makes the governed authored Orb the primary visible body and removes the rejected synthetic polyhedron shell', () => {
  assert.match(source,/v54-governed-authored-orb-primary-no-synthetic-polyhedron-shell/)
  assert.match(orbSource,/scale=\{1\.24\}/)
  assert.match(orbSource,/v54-governed-authored-orb-primary-visible-body-inside-wall-integrated-machine-seat/)
  assert.doesNotMatch(orbSource,/dodecahedronGeometry|icosahedronGeometry|sphereGeometry|torusGeometry/)
  assert.doesNotMatch(orbSource,/OrbArmorPlate/)
  assert.match(source,/object\.name\.startsWith\('orb-filament-'\)/)
  assert.match(source,/object\.name\.startsWith\('orb-petal-'\)/)
})

test('V54 removes four floor legs and frames the Orb from the rear wall instead of a display stand', () => {
  assert.match(source,/v54-wall-integrated-rear-shoulder-cradle-no-pedestal-no-four-floor-legs/)
  assert.match(source,/v54-rear-wall-load-paths-frame-authored-orb-without-ring-collar-or-display-plate/)
  assert.match(source,/home-v54-central-finished-stone-lane/)
  assert.match(source,/v54-dark-side-shoulders-frame-processional-lane-without-platform-or-grid/)
})

test('V54 preserves governed production assets and committed CC0 provenance', () => {
  assert.match(source,/home-v49-scanned-detail-layer/)
  assert.match(source,/V48_CAGED_SCONCE/)
  assert.equal(provenance.schema, 'urai.home.v48-production-assets.v1')
  assert.equal(provenance.runtimeFetchesPolyHavenApi, false)
  for (const asset of provenance.sourceAssets) for (const file of asset.files) assert.ok(existsSync(resolve(repositoryRoot, file.path)))
})

test('V54 Home State proof keeps the real lifecycle but makes static-export provider behavior deterministic', () => {
  assert.match(homeState,/open-air-sacred-tech-reliquary/)
  assert.match(homeState,/page\.route\('\*\*\/api\/orb-companion'/)
  assert.match(homeState,/fixtureRequests\[0\]\?\.message === 'Give me a short grounded reflection\.'/)
  assert.match(homeState,/data-home-orb-state/)
  assert.match(homeState,/listening/)
  assert.match(homeState,/thinking/)
  assert.match(homeState,/speaking/)
  assert.match(homeState,/privacy/)
})

test('V54 widens framing for environmental context and remains candidate-only until literal pixels pass', () => {
  assert.match(source,/const desiredFov=portrait\?54:48/)
  assert.match(source,/pitch=useRef\(0\.26\)/)
  assert.match(source,/data-home-visual-grade="cinematic-pbr-v54-authored-relic-sanctuary"/)
  assert.match(source,/data-home-final-art-revision="v54-authored-relic-sanctuary-candidate"/)
  assert.match(source,/data-home-art-certification="v54-retained-pixel-candidate-not-certified"/)
  assert.match(source,/data-home-animation-owner="authored-relic-v54-plus-governed-living-orb"/)
  assert.doesNotMatch(source,/PRODUCTION CERTIFIED|retained-pixel-pass|pixel-certified/)
})

test('embodied presence remains privacy-preserving',()=>{
  assert.match(source,/function HumanPresence/)
  assert.match(source,/visible=\{false\}/)
})
''')

portal = PORTAL_PROOF.read_text()
portal = replace_exact(portal, "runtimeContract: 'v53-integrated-arch-reliquary-home-real-glb-makehuman-orb-portal-semantic-and-visual-proof'", "runtimeContract: 'v54-authored-relic-sanctuary-home-real-glb-makehuman-orb-portal-semantic-and-visual-proof'", 1, 'Portal/Orb runtime contract')
portal = replace_exact(portal, "record.visualGrade === 'cinematic-pbr-v53-integrated-arch-reliquary'", "record.visualGrade === 'cinematic-pbr-v54-authored-relic-sanctuary'", 1, 'Portal/Orb visual grade')
portal = replace_exact(portal, "record.artRevision === 'v53-integrated-arch-reliquary-candidate'", "record.artRevision === 'v54-authored-relic-sanctuary-candidate'", 1, 'Portal/Orb art revision')
portal = replace_exact(portal, "record.artCertification === 'v53-retained-pixel-candidate-not-certified'", "record.artCertification === 'v54-retained-pixel-candidate-not-certified'", 1, 'Portal/Orb art certification')
PORTAL_PROOF.write_text(portal)

continuous = CONTINUOUS_PROOF.read_text()
continuous = replace_exact(continuous, "const newOwner = \"result.animationOwner === 'integrated-arch-v53-plus-governed-living-orb'\"", "const newOwner = \"result.animationOwner === 'authored-relic-v54-plus-governed-living-orb'\"", 1, 'Continuous animation owner')
CONTINUOUS_PROOF.write_text(continuous)

print('materialized V54 authored relic sanctuary from literal V53 polyhedron/tunnel/bollard rejection and repaired deterministic Home State proof')
