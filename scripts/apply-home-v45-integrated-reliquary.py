#!/usr/bin/env python3
from pathlib import Path
import re

source_path = Path('urai-tier1/src/spatial/layout/HomeWorldProductionFinal.tsx')
test_path = Path('urai-tier1/tests/home-relic-machine-realism-contract.test.mjs')
source = source_path.read_text()

# V45: shorten the retained authored filament family so it reads as an embedded core,
# not a decorative exploding star, while keeping the governed authored content.
needle = """    if (retiredDisplay) {
      object.visible = false
      object.userData.uraiRetiredVisualRole = 'v44-retire-glass-shell-orbits-and-crystalline-petal-display'
      return
    }
    if (!(object instanceof THREE.Mesh)) return
"""
replacement = """    if (retiredDisplay) {
      object.visible = false
      object.userData.uraiRetiredVisualRole = 'v45-retire-glass-shell-orbits-and-crystalline-petal-display'
      return
    }
    if (object.name.startsWith('orb-filament-')) {
      object.scale.multiplyScalar(0.3)
      object.userData.uraiIntegratedVisualRole = 'v45-short-authored-filament-inside-machine-core'
    }
    if (!(object instanceof THREE.Mesh)) return
"""
if needle not in source:
    raise SystemExit('cloneOrbModel V44 block not found')
source = source.replace(needle, replacement, 1)
source = source.replace("root.userData.uraiTreatment = 'v44-authored-heart-filament-core-no-glass-petals-no-rings'", "root.userData.uraiTreatment = 'v45-authored-heart-short-filament-core-embedded-no-glass-no-rings'", 1)

new_vault = r'''function ContinuousVaultSkin({pack}:{pack:SurfacePack}){
  const geometry=useMemo(()=>{
    const shape=new THREE.Shape()
    shape.moveTo(-5.9,-2.8);shape.lineTo(5.72,-2.8);shape.lineTo(5.5,2.1);shape.lineTo(4.25,3.02);shape.lineTo(1.55,3.52);shape.lineTo(-1.9,3.46);shape.lineTo(-4.35,2.94);shape.lineTo(-5.72,1.92);shape.closePath()
    const hole=new THREE.Path();hole.moveTo(-3.72,-2.3);hole.lineTo(3.68,-2.3);hole.lineTo(3.42,1.62);hole.lineTo(2.48,2.18);hole.lineTo(.82,2.48);hole.lineTo(-1.12,2.44);hole.lineTo(-2.72,2.12);hole.lineTo(-3.52,1.48);hole.closePath();shape.holes.push(hole)
    const g=new THREE.ExtrudeGeometry(shape,{depth:1.18,steps:1,curveSegments:18,bevelEnabled:true,bevelSegments:5,bevelSize:.13,bevelThickness:.13});g.center();g.computeVertexNormals();return g
  },[])
  useEffect(()=>()=>geometry.dispose(),[geometry])
  return <mesh name="home-v45-monolithic-reliquary-apse" geometry={geometry} position={[0,2.48,-7.2]} rotation={[0,.012,0]} castShadow receiveShadow userData={{treatment:'v45-single-angular-monolithic-apse-no-arch-facade-no-detached-slabs'}}><meshPhysicalMaterial color="#303734" normalMap={pack.normal} normalScale={new THREE.Vector2(.34,.34)} roughnessMap={pack.arm} roughness={.84} metalness={.035} clearcoat={.012} clearcoatRoughness={.92} envMapIntensity={.58}/></mesh>
}'''
source, n = re.subn(r"function ContinuousVaultSkin\(\{pack\}:\{pack:SurfacePack\}\)\{.*?\n\}", new_vault, source, count=1, flags=re.S)
if n != 1:
    raise SystemExit('ContinuousVaultSkin replacement failed')

new_cavity = r'''function MachineCavityLiner(){
  const geometry=useMemo(()=>{const shape=new THREE.Shape();shape.moveTo(-3.62,-2.18);shape.lineTo(3.58,-2.18);shape.lineTo(3.3,1.55);shape.lineTo(2.28,2.12);shape.lineTo(.7,2.4);shape.lineTo(-1.15,2.36);shape.lineTo(-2.7,2.03);shape.lineTo(-3.42,1.42);shape.closePath();const g=new THREE.ExtrudeGeometry(shape,{depth:.34,steps:1,curveSegments:12,bevelEnabled:true,bevelSegments:3,bevelSize:.08,bevelThickness:.08});g.center();g.computeVertexNormals();return g},[])
  useEffect(()=>()=>geometry.dispose(),[geometry])
  return <group name="home-v45-reliquary-cavity" userData={{treatment:'v45-deep-machined-cavity-with-layered-rear-bulkhead'}}>
    <mesh geometry={geometry} position={[0,2.16,-6.66]} castShadow receiveShadow><meshPhysicalMaterial color="#18201e" roughness={.72} metalness={.3} clearcoat={.02} clearcoatRoughness={.8} envMapIntensity={.62}/></mesh>
    <mesh position={[0,2.08,-6.43]} castShadow receiveShadow><boxGeometry args={[4.7,3.25,.18]}/><meshPhysicalMaterial color="#242c29" roughness={.67} metalness={.34} envMapIntensity={.68}/></mesh>
    <mesh position={[0,.54,-6.18]} castShadow receiveShadow><boxGeometry args={[4.15,.22,.5]}/><meshPhysicalMaterial color="#333a35" roughness={.7} metalness={.2} envMapIntensity={.65}/></mesh>
    <pointLight position={[-1.72,2.35,-5.95]} color="#82aaa3" intensity={.58} distance={5.8} decay={2}/>
    <pointLight position={[1.65,2.3,-5.92]} color="#b89c72" intensity={.54} distance={5.6} decay={2}/>
  </group>
}'''
source, n = re.subn(r"function MachineCavityLiner\(\)\{.*?\n\}", new_cavity, source, count=1, flags=re.S)
if n != 1:
    raise SystemExit('MachineCavityLiner replacement failed')

source = source.replace("visualOwner:'cinematic-monolithic-reliquary-sanctuary-v44',construction:'single-asymmetric-apse-with-integrated-reliquary',visualTreatment:'v44-monolithic-reliquary-apse-production-candidate'", "visualOwner:'cinematic-integrated-reliquary-sanctuary-v45',construction:'angular-monolithic-apse-with-recessed-machine-core',visualTreatment:'v45-integrated-reliquary-production-candidate'", 1)
source = source.replace("<group name=\"home-v44-depth-practicals\" userData={{treatment:'v44-restrained-recessed-foundation-lighting'}}>", "<group name=\"home-v45-depth-practicals\" userData={{treatment:'v45-restrained-recessed-foundation-lighting'}}>", 1)

new_wing = r'''function ReliquaryWing({side}:{side:-1|1}){
  const geometry=useMemo(()=>{const s=side,shape=new THREE.Shape();shape.moveTo(s*.72,-1.92);shape.lineTo(s*2.78,-2.35);shape.lineTo(s*2.6,-1.3);shape.lineTo(s*2.28,.65);shape.lineTo(s*1.7,1.7);shape.lineTo(s*.92,1.36);shape.lineTo(s*.74,.5);shape.closePath();const hole=new THREE.Path();hole.moveTo(s*1.18,-1.05);hole.lineTo(s*2.12,-1.28);hole.lineTo(s*1.92,.36);hole.lineTo(s*1.5,.92);hole.lineTo(s*1.1,.65);hole.closePath();shape.holes.push(hole);const g=new THREE.ExtrudeGeometry(shape,{depth:.72,steps:1,curveSegments:12,bevelEnabled:true,bevelSegments:5,bevelSize:.09,bevelThickness:.09});g.center();g.computeVertexNormals();return g},[side]);useEffect(()=>()=>geometry.dispose(),[geometry]);return <mesh name={side<0?'home-v45-left-machined-yoke':'home-v45-right-machined-yoke'} geometry={geometry} position={[0,2.05,-4.72]} rotation={[0,side*.025,side*.01]} castShadow receiveShadow userData={{treatment:'v45-dark-machined-floor-rooted-yoke-with-void-no-flat-panel-no-feet'}}><meshPhysicalMaterial color={side<0?'#27312f':'#34322d'} roughness={.7} metalness={.31} clearcoat={.016} clearcoatRoughness={.8} envMapIntensity={.67}/></mesh>
}'''
source, n = re.subn(r"function ReliquaryWing\(\{side\}:\{side:-1\|1\}\)\{.*?\n\}", new_wing, source, count=1, flags=re.S)
if n != 1:
    raise SystemExit('ReliquaryWing replacement failed')

source = source.replace("function CrownBridge(){return <group name=\"home-v44-reliquary-upper-seat\" userData={{treatment:'v44-yokes-terminate-into-apse-without-floating-crown'}} />}", "function CrownBridge(){return <group name=\"home-v45-reliquary-upper-seat\" userData={{treatment:'v45-yokes-seat-into-recessed-apse-without-floating-crown'}} />}", 1)
source = source.replace("function FloorReliquaryBed(){return <group name=\"home-v44-foundation-integration\" userData={{treatment:'v44-no-black-platform-floor-remains-continuous'}} />}", "function FloorReliquaryBed(){return <group name=\"home-v45-foundation-integration\" userData={{treatment:'v45-no-display-platform-no-contact-shadow-mat-floor-remains-continuous'}} />}", 1)
source = source.replace("function OrbCradle(){return <group name=\"home-orb-engineered-cradle\" userData={{treatment:'v44-monolithic-apse-and-broad-yokes-physically-capture-core-no-display-stand'}}><ReliquaryWing side={-1}/><ReliquaryWing side={1}/></group>}", "function OrbCradle(){return <group name=\"home-orb-engineered-cradle\" userData={{treatment:'v45-recessed-apse-and-machined-yokes-physically-seat-core-no-display-stand'}}><ReliquaryWing side={-1}/><ReliquaryWing side={1}/><CrownBridge/></group>}", 1)

source = source.replace("treatment:'v44-governed-authored-heart-filament-machine-core'", "treatment:'v45-governed-authored-heart-short-filament-recessed-machine-core'", 1)
source = source.replace("<group scale={1.58} position={[0,.04,0]} rotation={[0,.18,0]} name=\"home-orb-authored-core\" userData={{treatment:'v44-authored-heart-filament-core-no-glass-petals-no-rings'}}>", "<group scale={1.18} position={[0,.02,-.18]} rotation={[0,.18,0]} name=\"home-orb-authored-core\" userData={{treatment:'v45-authored-heart-short-filament-core-embedded-no-glass-no-rings'}}>", 1)
source = source.replace("treatment:'v44-engineered-body-is-monolithic-architectural-capture-no-display-object'", "treatment:'v45-engineered-body-is-recessed-architectural-capture-no-display-object'", 1)

# Remove the screen-space ContactShadows plane that rendered as a black display mat in the retained pixels.
source, n = re.subn(r"<ContactShadows position=\{\[0,0\.03,-3\.55\]\}[^>]*/>", "", source, count=1)
if n != 1:
    raise SystemExit('ContactShadows removal failed')

source = source.replace("color=\"#0c1110\" roughness={0.88}", "color=\"#242a27\" roughness={0.86}", 1)
source = source.replace("color=\"#171c19\" normalMap={pack.normal}", "color=\"#272d29\" normalMap={pack.normal}", 1)
source = source.replace("desiredFov=portrait?66:55", "desiredFov=portrait?72:58", 1)
source = source.replace("lookHeight=portrait?2.04:1.94", "lookHeight=portrait?1.9:1.86", 1)
source = source.replace("gl.toneMappingExposure=1.72", "gl.toneMappingExposure=1.68", 1)
source = source.replace("data-home-visual-grade=\"cinematic-pbr-v44-monolithic-reliquary-apse\"", "data-home-visual-grade=\"cinematic-pbr-v45-integrated-reliquary-apse\"", 1)
source = source.replace("data-home-final-art-revision=\"v44-monolithic-reliquary-apse-production-candidate\"", "data-home-final-art-revision=\"v45-integrated-reliquary-production-candidate\"", 1)
source = source.replace("data-home-art-certification=\"v44-retained-pixel-candidate\"", "data-home-art-certification=\"v45-retained-pixel-candidate\"", 1)

# Readiness must bind to V45 visible production objects, never retired V44 names.
source = source.replace("'home-sanctuary-pavilion', 'home-v44-monolithic-reliquary-apse', 'home-v44-reliquary-cavity',\n  'home-v44-depth-practicals', 'home-v44-left-foundation-yoke', 'home-v44-right-foundation-yoke',", "'home-sanctuary-pavilion', 'home-v45-monolithic-reliquary-apse', 'home-v45-reliquary-cavity',\n  'home-v45-depth-practicals', 'home-v45-left-machined-yoke', 'home-v45-right-machined-yoke',", 1)

required_markers = [
  'v45-integrated-reliquary-production-candidate',
  'v45-single-angular-monolithic-apse-no-arch-facade-no-detached-slabs',
  'v45-deep-machined-cavity-with-layered-rear-bulkhead',
  'v45-dark-machined-floor-rooted-yoke-with-void-no-flat-panel-no-feet',
  'v45-no-display-platform-no-contact-shadow-mat-floor-remains-continuous',
  'v45-authored-heart-short-filament-core-embedded-no-glass-no-rings',
  'desiredFov=portrait?72:58',
]
for marker in required_markers:
    if marker not in source:
        raise SystemExit(f'V45 marker missing after transform: {marker}')
if '<ContactShadows position={[0,0.03,-3.55]}' in source:
    raise SystemExit('V45 retained the black-mat ContactShadows plane')
source_path.write_text(source)

test_path.write_text("""import assert from 'node:assert/strict'\nimport { readFileSync } from 'node:fs'\nimport test from 'node:test'\n\nconst source = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionFinal.tsx', import.meta.url), 'utf8')\nconst orbStart = source.indexOf('function SacredOrb(')\nconst orbEnd = source.indexOf('function HumanPresence', orbStart)\nassert.ok(orbStart >= 0 && orbEnd > orbStart)\nconst orbSource = source.slice(orbStart, orbEnd)\n\ntest('V45 owns Home as an angular integrated apse instead of the rejected arch facade', () => {\n  assert.match(source,/v45-integrated-reliquary-production-candidate/)\n  assert.match(source,/v45-single-angular-monolithic-apse-no-arch-facade-no-detached-slabs/)\n  assert.match(source,/v45-deep-machined-cavity-with-layered-rear-bulkhead/)\n  assert.doesNotMatch(source,/home-v44-monolithic-reliquary-apse/)\n})\n\ntest('V45 reliquary uses dark machined floor-rooted yokes with voids and no display mat', () => {\n  assert.match(source,/v45-dark-machined-floor-rooted-yoke-with-void-no-flat-panel-no-feet/)\n  assert.match(source,/v45-no-display-platform-no-contact-shadow-mat-floor-remains-continuous/)\n  assert.match(source,/v45-recessed-apse-and-machined-yokes-physically-seat-core-no-display-stand/)\n  assert.doesNotMatch(source,/<coneGeometry/)\n  assert.doesNotMatch(source,/<ContactShadows position=\\{\\[0,0\\.03,-3\\.55\\]\\}/)\n})\n\ntest('V45 retires the glass display family and shortens retained authored filaments inside the machine core', () => {\n  assert.match(source,/object\\.name === 'orb-aura'/)\n  assert.match(source,/object\\.name === 'orb-core'/)\n  assert.match(source,/object\\.name\\.startsWith\\('orb-orbit-'\\)/)\n  assert.match(source,/object\\.name\\.startsWith\\('orb-petal-'\\)/)\n  assert.match(source,/object\\.name\\.startsWith\\('orb-filament-'\\)/)\n  assert.match(source,/object\\.scale\\.multiplyScalar\\(0\\.3\\)/)\n  assert.match(source,/v45-authored-heart-short-filament-core-embedded-no-glass-no-rings/)\n  assert.match(orbSource,/primitive object=\\{authoredOrb\\}/)\n  assert.match(orbSource,/scale=\\{1\\.18\\}/)\n  assert.doesNotMatch(orbSource,/torusGeometry|sphereGeometry|dodecahedronGeometry|icosahedronGeometry|octahedronGeometry/)\n})\n\ntest('V45 keeps photographic PBR and widens the mobile view without approving pixels by code', () => {\n  assert.match(source,/rock-tile-floor-diff-1k\\.webp/)\n  assert.match(source,/studio-small-08-1k\\.hdr/)\n  assert.match(source,/gl\\.toneMappingExposure=1\\.68/)\n  assert.match(source,/desiredFov=portrait\\?72:58/)\n  assert.match(source,/lookHeight=portrait\\?1\\.9:1\\.86/)\n})\n\ntest('embodied presence remains privacy-preserving',()=>{\n  assert.match(source,/function HumanPresence/)\n  assert.match(source,/visible=\\{false\\}/)\n})\n""")
print('Authored V45 integrated reliquary correction from literal V44 pixel failures')
