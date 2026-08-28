from pathlib import Path
import re

home = Path('urai-tier1/src/spatial/layout/HomeWorldProductionFinal.tsx')
test = Path('urai-tier1/tests/home-relic-machine-realism-contract.test.mjs')
s = home.read_text()

s = s.replace("'home-v46-left-apse-mass', 'home-v46-right-apse-mass', 'home-v46-reliquary-cavity',\n  'home-v46-depth-practicals', 'home-v46-left-machined-yoke', 'home-v46-right-machined-yoke',", "'home-v47-left-apse-mass', 'home-v47-right-apse-mass', 'home-v47-reliquary-cavity',\n  'home-v47-depth-practicals', 'home-v47-left-load-arm', 'home-v47-right-load-arm', 'home-v47-side-gallery',")

s = s.replace("v46-retire-glass-shell-orbits-and-crystalline-petal-display", "v47-retire-glass-shell-orbits-and-crystalline-petal-display")
s = s.replace("v46-small-authored-heart-behind-machined-aperture", "v47-small-authored-heart-deep-in-machined-aperture")
s = s.replace("object.scale.multiplyScalar(0.22)", "object.scale.multiplyScalar(0.14)")
s = s.replace("v46-short-authored-filament-inside-machine-core", "v47-minimal-authored-filament-deep-inside-machine-core")
s = s.replace("object.scale.multiplyScalar(0.12)", "object.scale.multiplyScalar(0.065)")
s = s.replace("v46-authored-heart-filament-trace-behind-machined-aperture-no-crystal-display", "v47-authored-heart-filament-trace-deep-behind-machined-aperture-no-crystal-display")

s = s.replace('name="home-v46-reliquary-apse"', 'name="home-v47-reliquary-apse"')
s = s.replace("v46-separated-load-bearing-apse-masses-with-deep-open-machine-bay-no-arch-facade", "v47-asymmetric-load-bearing-apse-masses-with-open-machine-bay-no-arch-facade")
s = s.replace('name="home-v46-left-apse-mass"', 'name="home-v47-left-apse-mass"')
s = s.replace('name="home-v46-right-apse-mass"', 'name="home-v47-right-apse-mass"')
s = s.replace('name="home-v46-reliquary-cavity"', 'name="home-v47-reliquary-cavity"')
s = s.replace("v46-deep-open-machine-bay-with-staggered-bulkheads-and-floor-service-depth", "v47-deep-open-machine-bay-with-staggered-bulkheads-floor-service-depth-and-side-galleries")

# Pull the two apse masses farther apart and deeper so the center reads as a recessed bay, not a cabinet facade.
s = s.replace("position={[-.18,2.35,-7.48]}", "position={[-.42,2.42,-7.82]}")
s = s.replace("position={[-.05,2.4,-7.56]}", "position={[-.08,2.5,-7.9]}")
s = s.replace("position={[.08,4.54,-7.34]}", "position={[.12,4.72,-7.76]}")

# Make the cavity deeper and less like a flat central box.
s = s.replace("position={[0,2.12,-7.1]}", "position={[0,2.18,-7.62]}")
s = s.replace("position={[-2.62,2.05,-6.56]}", "position={[-2.78,2.12,-7.02]}")
s = s.replace("position={[2.48,2.12,-6.62]}", "position={[2.62,2.18,-7.08]}")
s = s.replace("position={[0,.42,-6.48]}", "position={[0,.38,-6.92]}")
s = s.replace("position={[-2.0,2.5,-5.95]}", "position={[-2.15,2.55,-6.42]}")
s = s.replace("position={[1.92,2.36,-5.9]}", "position={[2.02,2.42,-6.38]}")

# Add irregular side gallery masses and floor-rooted depth outside the reliquary.
gallery = r'''function SanctuarySideGallery(){
  const left=useMemo(()=>{const q=new THREE.Shape();q.moveTo(-1.25,-2.2);q.lineTo(.92,-2.05);q.lineTo(1.12,1.28);q.lineTo(.38,2.05);q.lineTo(-.88,1.7);q.closePath();const g=new THREE.ExtrudeGeometry(q,{depth:2.2,steps:1,curveSegments:8,bevelEnabled:true,bevelSegments:4,bevelSize:.12,bevelThickness:.12});g.center();g.computeVertexNormals();return g},[])
  const right=useMemo(()=>left.clone(),[left])
  useEffect(()=>()=>{left.dispose();right.dispose()},[left,right])
  return <group name="home-v47-side-gallery" userData={{treatment:'v47-staggered-side-gallery-masses-create-sanctuary-depth-no-repeated-bays'}}>
    <mesh geometry={left} position={[-5.08,2.02,-5.62]} rotation={[0,.21,.035]} castShadow receiveShadow><meshPhysicalMaterial color="#202824" roughness={.83} metalness={.04} envMapIntensity={.62}/></mesh>
    <mesh geometry={right} position={[5.02,2.08,-5.9]} rotation={[0,-.18,-.026]} castShadow receiveShadow><meshPhysicalMaterial color="#262b27" roughness={.82} metalness={.045} envMapIntensity={.64}/></mesh>
    <pointLight position={[-4.5,1.2,-4.85]} color="#8db9af" intensity={.42} distance={5.2} decay={2}/>
    <pointLight position={[4.42,1.18,-5.1]} color="#c3a471" intensity={.38} distance={5.0} decay={2}/>
  </group>
}'''
s = s.replace("function SanctuaryArchitecture(){", gallery + "\n\nfunction SanctuaryArchitecture(){")
s = s.replace("<MachineCavityLiner/>\n  <ContinuousVaultSkin", "<SanctuarySideGallery/>\n  <MachineCavityLiner/>\n  <ContinuousVaultSkin")
s = s.replace("cinematic-integrated-reliquary-sanctuary-v46", "cinematic-integrated-reliquary-sanctuary-v47")
s = s.replace("separated-load-bearing-apse-masses-with-deep-machine-bay", "asymmetric-apse-side-galleries-and-deep-machine-bay")
s = s.replace("v46-integrated-machine-apse-production-candidate", "v47-sanctuary-depth-production-candidate")
s = s.replace("home-v46-depth-practicals", "home-v47-depth-practicals")
s = s.replace("v46-restrained-recessed-machine-bay-lighting", "v47-restrained-recessed-machine-bay-and-gallery-lighting")

# Replace tall cabinet-like cheek panels with low, canted load arms rooted into the foundation.
wing = r'''function ReliquaryWing({side}:{side:-1|1}){
  const geometry=useMemo(()=>{const q=new THREE.Shape();q.moveTo(-.72,-.72);q.lineTo(.82,-.84);q.lineTo(.62,.18);q.lineTo(.18,.9);q.lineTo(-.5,.72);q.lineTo(-.82,.08);q.closePath();const hole=new THREE.Path();hole.moveTo(-.28,-.24);hole.lineTo(.34,-.3);hole.lineTo(.22,.18);hole.lineTo(-.08,.48);hole.lineTo(-.34,.22);hole.closePath();q.holes.push(hole);const g=new THREE.ExtrudeGeometry(q,{depth:.82,steps:1,curveSegments:8,bevelEnabled:true,bevelSegments:4,bevelSize:.1,bevelThickness:.1});g.center();g.computeVertexNormals();return g},[])
  useEffect(()=>()=>geometry.dispose(),[geometry])
  return <mesh name={side<0?'home-v47-left-load-arm':'home-v47-right-load-arm'} geometry={geometry} position={[side*1.48,1.35,-6.2]} rotation={[side*.03,side*.22,side*.13]} castShadow receiveShadow userData={{treatment:'v47-low-canted-floor-rooted-load-arm-open-center-no-panel-no-visible-feet'}}><meshPhysicalMaterial color={side<0?'#25332f':'#39342a'} roughness={.62} metalness={.38} clearcoat={.02} clearcoatRoughness={.76} envMapIntensity={.74}/></mesh>
}'''
s = re.sub(r'function ReliquaryWing\(\{side\}:\{side:-1\|1\}\)\{.*?\n\}', wing, s, count=1, flags=re.S)
s = s.replace("home-v46-reliquary-upper-seat", "home-v47-reliquary-upper-seat").replace("v46-yokes-seat-into-deep-machine-bay-without-floating-crown", "v47-load-arms-seat-into-deep-machine-bay-without-floating-crown")
s = s.replace("home-v46-foundation-integration", "home-v47-foundation-integration").replace("v46-no-display-platform-floor-remains-continuous", "v47-no-display-platform-floor-remains-continuous")
s = s.replace("v46-deep-machine-bay-and-separated-yokes-physically-capture-core-no-display-stand", "v47-deep-machine-bay-and-low-load-arms-physically-capture-core-no-display-stand")

# Push the machine aperture and authored trace deeper and make it materially quieter.
s = s.replace('name="home-v46-machine-core-assembly" position={[0,0,-2.42]}', 'name="home-v47-machine-core-assembly" position={[0,0,-2.88]}')
s = s.replace("v46-layered-machined-aperture-captures-authored-heart-trace", "v47-layered-machined-aperture-deep-captures-authored-heart-trace")
s = s.replace("treatment:'v46-governed-authored-heart-filament-trace-captured-in-deep-machine-bay'", "treatment:'v47-governed-authored-heart-filament-trace-captured-deep-in-machine-bay'")
s = s.replace("<group scale={0.58} position={[0,.02,-2.16]}", "<group scale={0.38} position={[0,.02,-2.7]}")
s = s.replace("treatment:'v46-authored-heart-filament-trace-behind-machined-aperture-no-crystal-display'", "treatment:'v47-authored-heart-filament-trace-deep-behind-machined-aperture-no-crystal-display'")
s = s.replace("v46-engineered-body-is-deep-architectural-machine-capture-no-display-object", "v47-engineered-body-is-deep-architectural-machine-capture-no-display-object")

# Retire the two obvious freestanding arch/column portals from the hero view while retaining interaction hit areas.
threshold = r'''function ThresholdAlcove({tone,onActivate,authoredPortal=false}:{tone:'ground'|'life-map';onActivate:()=>void;authoredPortal?:boolean}){
  const portal=useGLTF(PORTAL_MODEL); const model=useMemo(()=>clonePortalModel(portal.scene),[portal.scene]); const accent=tone==='ground'?'#526d68':'#626784'
  return <group userData={{treatment:'v47-recessed-threshold-seam-no-freestanding-arch-or-columns',destination:tone}}>
    <mesh position={[0,.055,.04]} rotation={[-Math.PI/2,0,0]} receiveShadow><planeGeometry args={[1.9,.22]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={.12} roughness={.58} metalness={.32} /></mesh>
    {authoredPortal?<group position={[0,1.34,-1.35]} scale={0.026} visible={false}><primitive object={model} /></group>:null}
    <mesh position={[0,1.45,0.04]} onClick={(event)=>{event.stopPropagation();onActivate()}}><boxGeometry args={[2.2,2.9,1.1]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} /></mesh>
  </group>
}'''
s = re.sub(r"function ThresholdAlcove\(\{tone,onActivate,authoredPortal=false\}:\{tone:'ground'\|'life-map';onActivate:\(\)=>void;authoredPortal\?:boolean\}\)\{.*?\n\}", threshold, s, count=1, flags=re.S)

# Render the already-authored ceiling, sparse living edges, seams, and water channels so the room has depth instead of an empty plane.
needle = "<SanctuaryCourt target={props.target} /><SanctuaryArchitecture /><SanctuaryGlazing /><AtmosphericDepth /><OrbPlatform />"
replacement = "<SanctuaryCourt target={props.target} /><SanctuaryArchitecture /><SanctuaryCeiling /><SanctuaryGlazing /><FloorPanelJoints /><ReflectingChannel x={-4.72} /><ReflectingChannel x={4.72} /><PlantedEdges reducedMotion={props.reducedMotion} /><AtmosphericDepth /><OrbPlatform />"
s = s.replace(needle, replacement)

# Camera/exposure: reduce empty-floor dominance and improve material readability without clipping mobile architecture.
s = s.replace("const desiredFov=portrait?68:56", "const desiredFov=portrait?64:54")
s = s.replace("const lookHeight=portrait?1.82:1.78", "const lookHeight=portrait?1.74:1.72")
s = s.replace("gl.toneMappingExposure=1.9", "gl.toneMappingExposure=2.05")
s = s.replace('data-home-visual-grade="cinematic-pbr-v46-integrated-machine-apse"', 'data-home-visual-grade="cinematic-pbr-v47-sanctuary-depth"')
s = s.replace('data-home-final-art-revision="v46-integrated-machine-apse-production-candidate"', 'data-home-final-art-revision="v47-sanctuary-depth-production-candidate"')
s = s.replace('data-home-art-certification="v46-retained-pixel-candidate"', 'data-home-art-certification="v47-retained-pixel-candidate"')

home.write_text(s)

# Replace the narrow V46 verifier with a V47 exact source contract. Pixel approval remains external.
test.write_text(r'''import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionFinal.tsx', import.meta.url), 'utf8')
const orbStart = source.indexOf('function SacredOrb(')
const orbEnd = source.indexOf('function HumanPresence', orbStart)
assert.ok(orbStart >= 0 && orbEnd > orbStart)
const orbSource = source.slice(orbStart, orbEnd)

test('V47 replaces the cabinet facade with asymmetric sanctuary depth', () => {
  assert.match(source,/v47-sanctuary-depth-production-candidate/)
  assert.match(source,/v47-asymmetric-load-bearing-apse-masses-with-open-machine-bay-no-arch-facade/)
  assert.match(source,/v47-staggered-side-gallery-masses-create-sanctuary-depth-no-repeated-bays/)
  assert.match(source,/v47-deep-open-machine-bay-with-staggered-bulkheads-floor-service-depth-and-side-galleries/)
  assert.match(source,/home-v47-left-apse-mass/)
  assert.match(source,/home-v47-right-apse-mass/)
  assert.doesNotMatch(source,/home-v46-left-machined-yoke|home-v46-right-machined-yoke/)
})

test('V47 uses low canted load arms and no display stand', () => {
  assert.match(source,/v47-low-canted-floor-rooted-load-arm-open-center-no-panel-no-visible-feet/)
  assert.match(source,/v47-no-display-platform-floor-remains-continuous/)
  assert.match(source,/v47-deep-machine-bay-and-low-load-arms-physically-capture-core-no-display-stand/)
  assert.doesNotMatch(source,/<coneGeometry/)
  assert.doesNotMatch(source,/<ContactShadows position=\{\[0,0\.03,-3\.55\]\}/)
})

test('V47 removes freestanding portal arches from hero composition and deepens the authored core', () => {
  assert.match(source,/v47-recessed-threshold-seam-no-freestanding-arch-or-columns/)
  assert.match(source,/object\.scale\.multiplyScalar\(0\.14\)/)
  assert.match(source,/object\.scale\.multiplyScalar\(0\.065\)/)
  assert.match(source,/v47-authored-heart-filament-trace-deep-behind-machined-aperture-no-crystal-display/)
  assert.match(orbSource,/scale=\{0\.38\}/)
  assert.match(orbSource,/position=\{\[0,\.02,-2\.7\]\}/)
  assert.doesNotMatch(orbSource,/torusGeometry|sphereGeometry|dodecahedronGeometry|icosahedronGeometry|octahedronGeometry/)
})

test('V47 renders authored room depth and readable PBR without claiming pixel pass in code', () => {
  assert.match(source,/<SanctuaryCeiling \/>/)
  assert.match(source,/<FloorPanelJoints \/>/)
  assert.match(source,/<ReflectingChannel x=\{-4\.72\} \/>/)
  assert.match(source,/<PlantedEdges reducedMotion=\{props\.reducedMotion\} \/>/)
  assert.match(source,/rock-tile-floor-diff-1k\.webp/)
  assert.match(source,/studio-small-08-1k\.hdr/)
  assert.match(source,/gl\.toneMappingExposure=2\.05/)
  assert.match(source,/desiredFov=portrait\?64:54/)
})

test('embodied presence remains privacy-preserving',()=>{
  assert.match(source,/function HumanPresence/)
  assert.match(source,/visible=\{false\}/)
})
''')
