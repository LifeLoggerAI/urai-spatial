from pathlib import Path
import re

home_path = Path('urai-tier1/src/spatial/layout/HomeWorldProductionFinal.tsx')
ground_path = Path('urai-tier1/src/app/GroundSpatialWorldClean.tsx')
source = home_path.read_text()

if 'v39-authored-core-load-path-sanctuary-production-candidate' in source:
    print('HOME_V39_ALREADY_APPLIED')
    raise SystemExit(0)
if 'v38-integrated-machine-sanctuary-production-candidate' not in source:
    raise SystemExit('V39 requires the exact repaired V38 candidate')

def replace_range(start: str, end: str, replacement: str, label: str) -> None:
    global source
    pattern = re.escape(start) + r'.*?(?=' + re.escape(end) + r')'
    updated, count = re.subn(pattern, replacement.rstrip() + '\n\n', source, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f'{label}: expected one range, found {count}')
    source = updated

replace_range('function ReliquarySpine()', 'function ReliquaryWing(', r'''function ReliquarySpine(){
  const geometry=useMemo(()=>{const shape=new THREE.Shape();shape.moveTo(-1.78,-1.9);shape.lineTo(1.78,-1.9);shape.lineTo(2.04,-1.12);shape.lineTo(1.92,1.34);shape.bezierCurveTo(1.48,2.14,.84,2.58,0,2.72);shape.bezierCurveTo(-.84,2.58,-1.48,2.14,-1.92,1.34);shape.lineTo(-2.04,-1.12);shape.closePath();const g=new THREE.ExtrudeGeometry(shape,{depth:.92,steps:1,curveSegments:28,bevelEnabled:true,bevelSegments:6,bevelSize:.09,bevelThickness:.09});g.center();g.computeVertexNormals();return g},[])
  useEffect(()=>()=>geometry.dispose(),[geometry])
  return <group position={[0,2.08,-1.58]} name="home-orb-reliquary-spine" userData={{treatment:'v39-recessed-bearing-machine-spine'}}>
    <mesh geometry={geometry} castShadow receiveShadow><meshPhysicalMaterial color="#202b28" roughness={.38} metalness={.58} clearcoat={.06} clearcoatRoughness={.42} envMapIntensity={1.0}/></mesh>
    <RoundedBox args={[2.46,2.76,.32]} radius={.18} smoothness={6} position={[0,-.12,.56]} castShadow receiveShadow><meshPhysicalMaterial color="#111918" roughness={.54} metalness={.38} clearcoat={.035} clearcoatRoughness={.54} envMapIntensity={.88}/></RoundedBox>
    <RoundedBox args={[1.48,1.96,.22]} radius={.22} smoothness={6} position={[0,-.1,.76]} castShadow><meshStandardMaterial color="#293b37" metalness={.62} roughness={.34}/></RoundedBox>
    {[-.72,0,.72].map((x)=><mesh key={x} position={[x,-1.52,.86]} rotation={[Math.PI/2,0,0]} castShadow><cylinderGeometry args={[.1,.1,.16,16]}/><meshStandardMaterial color="#7b8177" metalness={.9} roughness={.24}/></mesh>)}
  </group>
}''', 'V39 bearing spine')

replace_range('function ReliquaryWing(', 'function CrownBridge', r'''function ReliquaryWing({side}:{side:-1|1}){
  const geometry=useMemo(()=>{const s=side,shape=new THREE.Shape();shape.moveTo(1.28*s,-1.96);shape.lineTo(2.5*s,-1.72);shape.bezierCurveTo(2.88*s,-.92,2.94*s,.34,2.62*s,1.4);shape.bezierCurveTo(2.4*s,2.12,1.94*s,2.56,1.48*s,2.7);shape.lineTo(1.02*s,2.18);shape.bezierCurveTo(1.34*s,1.32,1.46*s,.36,1.36*s,-.58);shape.bezierCurveTo(1.3*s,-1.12,1.12*s,-1.55,.84*s,-1.82);shape.closePath();const g=new THREE.ExtrudeGeometry(shape,{depth:1.18,steps:1,curveSegments:26,bevelEnabled:true,bevelSegments:6,bevelSize:.1,bevelThickness:.1});g.center();g.computeVertexNormals();return g},[side])
  useEffect(()=>()=>geometry.dispose(),[geometry])
  return <group position={[0,2.05,-1.13]} userData={{treatment:'v39-floor-to-vault-bearing-pier-no-floating-jaw'}}>
    <mesh geometry={geometry} castShadow receiveShadow><meshPhysicalMaterial color={side<0?'#22332f':'#383328'} roughness={.4} metalness={.5} clearcoat={.055} clearcoatRoughness={.44} envMapIntensity={.96}/></mesh>
    <RoundedBox args={[.38,2.88,.42]} radius={.12} smoothness={5} position={[side*1.82,-.12,.7]} rotation={[0,0,side*.045]} castShadow><meshStandardMaterial color={side<0?'#506c65':'#746851'} metalness={.74} roughness={.3}/></RoundedBox>
    <RoundedBox args={[.72,.34,.46]} radius={.09} smoothness={4} position={[side*1.44,-1.56,.72]} castShadow><meshStandardMaterial color="#59635d" metalness={.76} roughness={.3}/></RoundedBox>
  </group>
}''', 'V39 load piers')

replace_range('function CrownBridge()', 'function FloorReliquaryBed', r'''function CrownBridge(){
  const geometry=useMemo(()=>{const shape=new THREE.Shape();shape.moveTo(-3.0,-.62);shape.lineTo(-2.64,.08);shape.bezierCurveTo(-1.9,.92,-1.02,1.28,0,1.34);shape.bezierCurveTo(1.02,1.28,1.9,.92,2.64,.08);shape.lineTo(3.0,-.62);shape.lineTo(2.5,-.96);shape.bezierCurveTo(1.66,-.34,.92,-.08,0,-.04);shape.bezierCurveTo(-.92,-.08,-1.66,-.34,-2.5,-.96);shape.closePath();const g=new THREE.ExtrudeGeometry(shape,{depth:1.2,steps:1,curveSegments:28,bevelEnabled:true,bevelSegments:6,bevelSize:.1,bevelThickness:.1});g.center();g.computeVertexNormals();return g},[])
  useEffect(()=>()=>geometry.dispose(),[geometry])
  return <group position={[0,4.02,-1.12]} name="home-orb-load-crown" userData={{treatment:'v39-structural-vault-crown-direct-pier-bearing'}}>
    <mesh geometry={geometry} castShadow receiveShadow><meshPhysicalMaterial color="#2a3531" roughness={.36} metalness={.56} clearcoat={.05} clearcoatRoughness={.42} envMapIntensity={1.0}/></mesh>
    <RoundedBox args={[3.7,.26,.36]} radius={.1} smoothness={5} position={[0,.08,.72]} castShadow><meshStandardMaterial color="#68746d" metalness={.82} roughness={.28}/></RoundedBox>
  </group>
}''', 'V39 crown')

replace_range('function FloorReliquaryBed()', 'function OrbPlatform()', r'''function FloorReliquaryBed(){
  const accessGeometry=useMemo(()=>{const shape=new THREE.Shape();shape.moveTo(-2.76,-1.0);shape.lineTo(-1.78,-1.52);shape.lineTo(1.82,-1.5);shape.lineTo(2.8,-.98);shape.lineTo(2.42,-.68);shape.lineTo(-2.4,-.68);shape.closePath();const g=new THREE.ExtrudeGeometry(shape,{depth:.052,steps:1,bevelEnabled:true,bevelSegments:3,bevelSize:.028,bevelThickness:.02});g.rotateX(-Math.PI/2);g.computeVertexNormals();return g},[])
  useEffect(()=>()=>accessGeometry.dispose(),[accessGeometry])
  return <group name="home-orb-machine-floor-integration" userData={{treatment:'v39-recessed-floor-service-trench-no-plinth',visualTreatment:'v39-bearing-loads-terminate-below-floor'}}>
    <mesh geometry={accessGeometry} position={[0,.014,-3.2]} receiveShadow><meshPhysicalMaterial color="#101615" roughness={.64} metalness={.3} clearcoat={.025} clearcoatRoughness={.62} envMapIntensity={.72}/></mesh>
    <RoundedBox args={[.5,.12,2.7]} radius={.05} smoothness={4} position={[-2.24,.04,-3.08]} rotation={[0,.08,0]} receiveShadow><meshStandardMaterial color="#344842" metalness={.58} roughness={.48}/></RoundedBox>
    <RoundedBox args={[.5,.12,2.7]} radius={.05} smoothness={4} position={[2.24,.04,-3.08]} rotation={[0,-.08,0]} receiveShadow><meshStandardMaterial color="#4d4638" metalness={.58} roughness={.48}/></RoundedBox>
  </group>
}''', 'V39 floor integration')

replace_range('function OrbCradle()', 'function SacredOrb(', r'''function OrbCradle(){return <group name="home-orb-engineered-cradle" position={[0,0,-3.72]} userData={{treatment:'v39-architectural-reliquary-machine',visualTreatment:'v39-direct-floor-pier-crown-bearing-frame'}}>
  <ReliquarySpine/><ReliquaryWing side={-1}/><ReliquaryWing side={1}/><CrownBridge/>
  <TaperedLoadBeam from={[-2.28,.14,-1.18]} to={[-1.54,1.42,-.66]} width={.34} color="#49635c"/>
  <TaperedLoadBeam from={[2.28,.14,-1.18]} to={[1.54,1.42,-.66]} width={.34} color="#675d49"/>
  <TaperedLoadBeam from={[-1.56,3.62,-.74]} to={[-.78,2.74,-.58]} width={.28} color="#66756e"/>
  <TaperedLoadBeam from={[1.56,3.62,-.74]} to={[.78,2.74,-.58]} width={.28} color="#746b58"/>
</group>}''', 'V39 integrated frame')

replace_range('function SacredOrb(', 'function HumanPresence', r'''function SacredOrb({state,reducedMotion,onOpen}:{state:OrbState;reducedMotion:boolean;onOpen:()=>void}){
  const root=useRef<THREE.Group>(null),activeAction=useRef<THREE.AnimationAction|null>(null)
  const orb=useGLTF(ORB_MODEL)
  const authoredOrb=useMemo(()=>cloneOrbModel(orb.scene),[orb.scene])
  const {actions}=useAnimations(orb.animations,authoredOrb)
  const sensory=useMemo(()=>resolveOrbSensoryOutput(state,reducedMotion,true),[state,reducedMotion])
  useEffect(()=>{const allActions=Object.values(actions).filter((action):action is THREE.AnimationAction=>Boolean(action));if(reducedMotion){allActions.forEach((action)=>action.stop());activeAction.current=null;return}const next=actions[ORB_CLIPS[state]];if(!next)return;const previous=activeAction.current;if(previous&&previous!==next)previous.fadeOut(.2);next.reset().setLoop(THREE.LoopRepeat,Infinity).fadeIn(.2).play();activeAction.current=next},[actions,reducedMotion,state])
  useEffect(()=>()=>{Object.values(actions).forEach((action)=>action?.stop())},[actions])
  useFrame(({clock})=>{if(!root.current)return;root.current.rotation.y=reducedMotion?0:Math.sin(clock.elapsedTime*.08)*.006;root.current.position.y=ORB.y})
  const stateColor=state==='warning'?'#d0a06e':state==='thinking'||state==='reflecting'?'#a4b3d6':'#86d4ca'
  const intensity=state==='speaking'?1.08:state==='listening'?.98:.8
  return <group ref={root} name="home-orb-sanctuary" position={ORB} onClick={(event)=>{event.stopPropagation();onOpen()}} userData={{orbState:state,animation:sensory.animation,modelClip:ORB_CLIPS[state],runtimeAsset:ORB_MODEL,treatment:'v39-governed-authored-core-inside-load-bearing-reliquary'}}>
    <group scale={.035} name="home-orb-authored-core"><primitive object={authoredOrb}/></group>
    <group name="home-orb-engineered-body">
      <RoundedBox args={[.42,1.62,.62]} radius={.16} smoothness={6} position={[-.72,0,.04]} rotation={[0,.1,-.08]} castShadow><meshPhysicalMaterial color="#263632" roughness={.34} metalness={.62} clearcoat={.07} clearcoatRoughness={.38} envMapIntensity={1.08}/></RoundedBox>
      <RoundedBox args={[.42,1.62,.62]} radius={.16} smoothness={6} position={[.72,0,.04]} rotation={[0,-.1,.08]} castShadow><meshPhysicalMaterial color="#3a352b" roughness={.34} metalness={.62} clearcoat={.07} clearcoatRoughness={.38} envMapIntensity={1.08}/></RoundedBox>
      <RoundedBox args={[1.16,.32,.58]} radius={.14} smoothness={6} position={[0,.92,.02]} castShadow><meshStandardMaterial color="#566762" metalness={.76} roughness={.28}/></RoundedBox>
      <RoundedBox args={[1.12,.3,.58]} radius={.14} smoothness={6} position={[0,-.92,.02]} castShadow><meshStandardMaterial color="#4a524d" metalness={.74} roughness={.3}/></RoundedBox>
      <mesh position={[0,0,.5]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.62,.045,12,72]}/><meshStandardMaterial color="#718982" emissive={stateColor} emissiveIntensity={intensity*.14} metalness={.82} roughness={.26}/></mesh>
      <RoundedBox args={[.18,.68,.22]} radius={.06} smoothness={4} position={[0,0,.72]} castShadow><meshStandardMaterial color="#8d998f" emissive={stateColor} emissiveIntensity={intensity*.08} metalness={.86} roughness={.22}/></RoundedBox>
    </group>
    <pointLight color={stateColor} intensity={intensity*.48} distance={5.2} decay={2}/>
  </group>
}''', 'V39 authored core')

replacements = {
    '<ambientLight intensity={0.22} color="#d6dbd4" />':'<ambientLight intensity={0.4} color="#dce5df" />',
    "<hemisphereLight args={['#8fa9a2','#111612',0.38]} />":"<hemisphereLight args={['#abc3bc','#18201b',0.62]} />",
    'intensity={0.66} color="#dfd8c7"':'intensity={0.96} color="#efe3cf"',
    'intensity={0.46} color="#6f9c98"':'intensity={0.68} color="#87bbb5"',
    'intensity={2.05} color="#e5c995"':'intensity={3.15} color="#f0d9ac"',
    'intensity={0.72} distance={9.4}':'intensity={1.22} distance={10.8}',
    'data-home-visual-grade="cinematic-pbr-v37-continuous-vault-reliquary-sanctuary"':'data-home-visual-grade="cinematic-pbr-v39-authored-core-load-path-sanctuary"',
    'data-home-final-art-revision="v38-integrated-machine-sanctuary-production-candidate"':'data-home-final-art-revision="v39-authored-core-load-path-sanctuary-production-candidate"',
    'data-home-art-certification="v38-retained-pixel-candidate"':'data-home-art-certification="v39-retained-pixel-candidate"',
    'gl.toneMappingExposure=1.14':'gl.toneMappingExposure=1.36',
}
for old, new in replacements.items():
    source = source.replace(old, new)
home_path.write_text(source)

ground = ground_path.read_text()
for old, new in {
    '<color attach="background" args={["#102b38"]} />':'<color attach="background" args={["#173a43"]} />',
    '<fogExp2 attach="fog" args={["#173843", 0.012]} />':'<fogExp2 attach="fog" args={["#244b50", 0.0075]} />',
    '<ambientLight intensity={0.52} color="#d8f4f2" />':'<ambientLight intensity={0.78} color="#e2f4ef" />',
    '<hemisphereLight args={["#eaf8ef", "#1f2d2c", 1.05]} />':'<hemisphereLight args={["#f0faf5", "#283b38", 1.34]} />',
    'intensity={3.25} color="#ffd7a0"':'intensity={4.35} color="#ffe0b1"',
    '<Bloom intensity={0.24}':'<Bloom intensity={0.17}',
    '<Vignette eskil={false} offset={0.12} darkness={0.12} />':'<Vignette eskil={false} offset={0.08} darkness={0.035} />',
    'gl.toneMappingExposure = 1.35;':'gl.toneMappingExposure = 1.72;',
    'filter:saturate(1.02) contrast(1.015)':'filter:saturate(1.04) contrast(1.01) brightness(1.06)',
}.items():
    ground = ground.replace(old, new)
if 'data-ground-compositing-treatment=' not in ground:
    ground = ground.replace('data-ground-no-compositing-bands="true"', 'data-ground-no-compositing-bands="true" data-ground-compositing-treatment="v39-screen-space-band-suppressed"')
style_anchor = '        @media(prefers-reduced-motion:reduce)'
style_patch = "        :global(.urai-world-atmosphere[data-realm='infrastructure-hub'] .urai-world-atmosphere__horizon),:global(.urai-world-atmosphere[data-realm='infrastructure-hub'] .urai-world-atmosphere__threshold){opacity:0!important;box-shadow:none!important}\n        :global(.urai-world-atmosphere[data-realm='infrastructure-hub'] .urai-world-atmosphere__depth){box-shadow:inset 0 0 90px rgba(0,0,0,.16),inset 0 -10vh 80px rgba(0,0,0,.12)!important}\n"
if 'v39-screen-space-band-suppressed' in ground and 'infrastructure-hub' not in ground.split(style_anchor)[0][-800:]:
    ground = ground.replace(style_anchor, style_patch + style_anchor, 1)
ground_path.write_text(ground)
print('HOME_V39_PRODUCTION_FINISH_APPLIED')
