from pathlib import Path
import re


def replace(path, old, new, expected=1):
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != expected:
        raise SystemExit(f'{path}: expected {expected} occurrence(s), found {count}: {old[:100]!r}')
    p.write_text(text.replace(old, new))


def sub(path, pattern, replacement, expected=1):
    p = Path(path)
    text = p.read_text()
    updated, count = re.subn(pattern, replacement, text, flags=re.S)
    if count != expected:
        raise SystemExit(f'{path}: expected {expected} regex replacement(s), found {count}: {pattern[:100]!r}')
    p.write_text(updated)


replace(
    'urai-tier1/tests/embodied-exploration-contract.test.mjs',
    r"assert.match(homeProduction, /const duration=reducedMotion\?0\.45:/)",
    r"assert.match(homeProduction, /const duration=reducedMotion\?0\.9:/)",
)

replace(
    'scripts/capture-continuous-spatial-proof-v18.mjs',
    """const orbClips = {
  dormant: 'Orb_Resting', idle: 'Orb_Idle', attention: 'Orb_Attention', listening: 'Orb_Listening',
  thinking: 'Orb_Thinking', speaking: 'Orb_Speaking', guiding: 'Orb_Guiding', reflecting: 'Orb_Reflecting',
  calming: 'Orb_Calming', privacy: 'Orb_Privacy', warning: 'Orb_Degraded', transition: 'Orb_Transition',
}""",
    """const orbSensoryClips = {
  dormant: 'orb-rest', idle: 'orb-breathe', attention: 'orb-attention', listening: 'orb-listening',
  thinking: 'orb-thinking', speaking: 'orb-speaking', guiding: 'orb-guide', reflecting: 'orb-reflect',
  calming: 'orb-calm', privacy: 'orb-privacy', warning: 'orb-warning', transition: 'orb-transition',
}
const orbModelClips = {
  dormant: 'Orb_Resting', idle: 'Orb_Idle', attention: 'Orb_Attention', listening: 'Orb_Listening',
  thinking: 'Orb_Thinking', speaking: 'Orb_Speaking', guiding: 'Orb_Guiding', reflecting: 'Orb_Reflecting',
  calming: 'Orb_Calming', privacy: 'Orb_Privacy', warning: 'Orb_Degraded', transition: 'Orb_Transition',
}""",
)
replace(
    'scripts/capture-continuous-spatial-proof-v18.mjs',
    "    orbClip: await owner.getAttribute('data-home-orb-clip'),",
    "    orbClip: await owner.getAttribute('data-home-orb-clip'),\n    orbModelClip: await owner.getAttribute('data-home-orb-model-clip'),",
)
replace(
    'scripts/capture-continuous-spatial-proof-v18.mjs',
    "    && result.orbClip === orbClips[expected.orbState] && result.animationOwner === 'authored-sanctuary-plus-gltf-interactions'",
    "    && result.orbClip === orbSensoryClips[expected.orbState] && result.orbModelClip === orbModelClips[expected.orbState]\n    && result.animationOwner === 'authored-sanctuary-plus-gltf-interactions'",
)

home = 'urai-tier1/src/spatial/layout/HomeWorldProductionFinal.tsx'
replace(home, '<PouredStone position={[0,0.035,0]} size={[1.54,0.08,1.18]} color="#151c1a" metalness={0.16} roughness={0.5} />', '<PouredStone position={[0,0.018,0]} size={[1.36,0.04,0.98]} color="#18201d" metalness={0.2} roughness={0.48} />')
replace(home, '<MetalTrim position={[0,0.08,0.42]} size={[0.72,0.008,0.018]} color="#81785f" intensity={0.008} />', '<MetalTrim position={[0,0.042,0.36]} size={[0.62,0.006,0.014]} color="#81785f" intensity={0.008} />')

sub(
    home,
    r"const FIN_Z = \[3\.15, -2\.35, -7\.05\] as const\nfunction SanctuaryArchitecture\(\) \{.*?\n\}\n\nfunction SanctuaryGlazing",
    """function SanctuaryArchitecture() {
  const pack = useStonePack(1.1,1.65)
  return <group name="home-sanctuary-pavilion" userData={{ visualOwner:'material-authored-sacred-tech-sanctuary-v25',construction:'asymmetric-load-bearing-court-with-deep-recesses',visualTreatment:'v26-monolithic-open-court' }}>
    <group rotation={[0,0.075,0]}>
      <ArchitecturalStone pack={pack} position={[-6.82,1.72,2.0]} size={[0.74,3.35,5.4]} color="#1c2420" roughness={0.65} />
      <ArchitecturalStone pack={pack} position={[-6.08,2.42,-5.85]} size={[1.62,4.6,3.55]} color="#252d28" roughness={0.61} />
    </group>
    <group rotation={[0,-0.055,0]}>
      <ArchitecturalStone pack={pack} position={[6.76,2.18,0.45]} size={[0.66,4.1,7.0]} color="#1a211e" roughness={0.67} />
      <ArchitecturalStone pack={pack} position={[5.86,1.52,-7.15]} size={[1.92,2.8,2.35]} color="#29312c" roughness={0.6} />
    </group>
    <group rotation={[0,0.035,0]}>
      <ArchitecturalStone pack={pack} position={[-3.15,1.55,-9.38]} size={[4.65,2.65,0.62]} color="#2a332e" roughness={0.61} />
      <ArchitecturalStone pack={pack} position={[2.2,2.38,-9.52]} size={[3.85,4.12,0.72]} color="#202824" roughness={0.64} />
      <ArchitecturalStone pack={pack} position={[4.72,0.82,-9.25]} size={[1.05,1.35,0.48]} color="#343b34" roughness={0.58} />
    </group>
    <ArchitecturalStone pack={pack} position={[-5.18,0.62,-1.7]} size={[0.58,1.05,2.15]} color="#333b35" roughness={0.59} />
    <ArchitecturalStone pack={pack} position={[5.28,0.78,-3.7]} size={[0.52,1.35,2.65]} color="#2d3530" roughness={0.61} />
    <MetalTrim position={[-3.0,2.9,-9.02]} size={[2.55,0.018,0.025]} color="#8b8063" intensity={0.014} />
    <MetalTrim position={[2.15,3.58,-9.12]} size={[1.62,0.016,0.024]} color="#597777" intensity={0.014} />
    <RecessedPractical position={[-5.25,0.18,2.6]} /><RecessedPractical position={[5.3,0.18,1.35]} warm={false} />
    <RecessedPractical position={[-5.65,0.18,-6.9]} warm={false} /><RecessedPractical position={[5.55,0.18,-7.65]} />
  </group>
}

function SanctuaryGlazing""",
)

sub(
    home,
    r"function SanctuaryCeiling\(\) \{.*?\n\}\n\nfunction FloorPanelJoints",
    """function SanctuaryCeiling() {
  const pack = useStonePack(1.0,1.45)
  return <group name="home-architectural-canopy" userData={{ treatment:'asymmetric-load-bearing-canopy-v25',visualTreatment:'v26-open-ribbed-skylight' }}>
    <group rotation={[0,0.12,0]}><ArchitecturalStone pack={pack} position={[-3.8,4.08,2.35]} size={[4.9,0.34,0.52]} color="#1c2420" roughness={0.66} /></group>
    <group rotation={[0,-0.09,0]}><ArchitecturalStone pack={pack} position={[3.25,4.0,0.1]} size={[5.4,0.3,0.48]} color="#18201d" roughness={0.69} /></group>
    <group rotation={[0,0.07,0]}><ArchitecturalStone pack={pack} position={[-2.15,4.18,-4.55]} size={[5.65,0.32,0.5]} color="#202824" roughness={0.66} /></group>
    <group rotation={[0,-0.11,0]}><ArchitecturalStone pack={pack} position={[3.65,4.12,-7.25]} size={[4.15,0.3,0.46]} color="#171f1c" roughness={0.7} /></group>
    <ArchitecturalStone pack={pack} position={[-5.7,3.55,-5.3]} size={[0.38,0.42,5.1]} color="#151d1a" roughness={0.71} />
    <ArchitecturalStone pack={pack} position={[5.82,3.48,2.6]} size={[0.34,0.38,3.6]} color="#161e1b" roughness={0.71} />
    <MetalTrim position={[-3.7,3.86,2.34]} size={[1.35,0.014,0.022]} color="#8b8063" intensity={0.014} />
    <MetalTrim position={[3.15,3.79,0.08]} size={[1.25,0.014,0.022]} color="#557474" intensity={0.014} />
  </group>
}

function FloorPanelJoints""",
)

sub(
    home,
    r"function OrbPlatform\(\)\{.*?\n\}\n\nfunction OrbCradle",
    """function OrbPlatform(){
  return <group name="home-orb-machine-plinth" position={[0,0,-2.15]} userData={{treatment:'flush-machined-relic-socket-v25',visualTreatment:'v26-recessed-three-point-dock'}}>
    <PouredStone position={[0,0.038,0]} size={[1.16,0.045,0.84]} color="#1c2521" metalness={0.34} roughness={0.4} />
    <MetalTrim position={[0,0.064,0.31]} size={[0.42,0.006,0.018]} color="#8f8467" intensity={0.012} />
  </group>
}

function OrbCradle""",
)
sub(
    home,
    r"function OrbCradle\(\)\{.*?\n\}\n\nfunction SacredOrb",
    """function OrbCradle(){
  return <group name="home-orb-engineered-cradle" position={[0,0,-2.15]} userData={{treatment:'low-three-point-machined-yoke-v25',visualTreatment:'v26-cantilever-docking-yoke-no-stem'}}>
    <PouredStone position={[-0.38,0.16,0.14]} size={[0.26,0.12,0.34]} color="#202a26" metalness={0.42} roughness={0.38} />
    <PouredStone position={[0.38,0.16,0.14]} size={[0.26,0.12,0.34]} color="#202a26" metalness={0.42} roughness={0.38} />
    <PouredStone position={[0,0.16,-0.36]} size={[0.28,0.12,0.3]} color="#252c28" metalness={0.45} roughness={0.36} />
    <mesh position={[-0.31,0.58,0.05]} rotation={[0.05,0,-0.68]} castShadow><cylinderGeometry args={[0.036,0.058,0.78,12]} /><meshStandardMaterial color="#4a5751" metalness={0.9} roughness={0.23} /></mesh>
    <mesh position={[0.31,0.58,0.05]} rotation={[0.05,0,0.68]} castShadow><cylinderGeometry args={[0.036,0.058,0.78,12]} /><meshStandardMaterial color="#4a5751" metalness={0.9} roughness={0.23} /></mesh>
    <mesh position={[0,0.58,-0.28]} rotation={[0.92,0,0]} castShadow><cylinderGeometry args={[0.034,0.054,0.72,12]} /><meshStandardMaterial color="#837960" metalness={0.88} roughness={0.25} /></mesh>
  </group>
}

function SacredOrb""",
)

replace(home, "state==='speaking'?0.238:state==='listening'?0.232:0.226+Math.sin(clock.elapsedTime*0.9)*0.002", "state==='speaking'?0.292:state==='listening'?0.286:0.28+Math.sin(clock.elapsedTime*0.9)*0.003")
replace(home, 'scale={0.226} name="home-orb-authored-core"', 'scale={0.28} name="home-orb-authored-core"')
replace(home, 'scale={[0.39,0.46,0.34]} castShadow', 'scale={[0.49,0.58,0.43]} castShadow')
replace(home, 'position={[0,0.405,0]} rotation={[0,0.18,0]}', 'position={[0,0.52,0]} rotation={[0,0.18,0]}')
replace(home, 'cylinderGeometry args={[0.16,0.235,0.105,16]}', 'cylinderGeometry args={[0.2,0.29,0.12,16]}')
replace(home, 'position={[0,-0.405,0]} rotation={[0,-0.16,0]}', 'position={[0,-0.52,0]} rotation={[0,-0.16,0]}')
replace(home, 'cylinderGeometry args={[0.235,0.16,0.105,16]}', 'cylinderGeometry args={[0.29,0.2,0.12,16]}')
replace(home, 'torusGeometry args={[0.345,0.008,8,96]}', 'torusGeometry args={[0.43,0.009,8,96]}')
replace(home, 'torusGeometry args={[0.48,0.0042,10,112]}', 'torusGeometry args={[0.57,0.0045,10,112]}')
replace(home, 'torusGeometry args={[0.43,0.004,10,112]}', 'torusGeometry args={[0.5,0.0043,10,112]}')
sub(home, r'<mesh name="home-orb-stabilizer-ring-3".*?</mesh>', '', expected=1)
replace(home, 'scale={scale*1.42}', 'scale={scale*1.9}')
replace(home, 'position={[0,-0.04,0.355]}', 'position={[0,-0.04,0.45]}')
replace(home, 'intensity={intensity*0.2} distance={2.6}', 'intensity={intensity*0.34} distance={3.4}')

old_rig = """  useFrame(({clock},delta)=>{if(transition!=='none'){if(started.current===null)started.current=clock.elapsedTime;const duration=reducedMotion?0.9:transition==='life-map'?3.4:2.6;const t=THREE.MathUtils.smootherstep(THREE.MathUtils.clamp((clock.elapsedTime-started.current)/duration,0,1),0,1);const sequence:TransitionSequence=transition==='life-map'?(t<0.16?'life-map:opening':t<0.84?'life-map:traversal':'life-map:closing'):(t<0.16?'ground:opening':t<0.84?'ground:traversal':'ground:closing');if(sequence!==lastSequence.current){lastSequence.current=sequence;onTransitionSequence(sequence)}if(transition==='life-map'){camera.position.lerp(new THREE.Vector3(0,30,-30),1-Math.pow(0.002,delta));camera.lookAt(0,9+t*20,-18-t*20);useSceneStore.getState().setProgress(t)}else{camera.position.lerp(new THREE.Vector3(-5.2,-2,-13.35),1-Math.pow(0.002,delta));camera.lookAt(-5.2,-0.8,-14.6)}if(t>=1&&!issued.current){issued.current=true;onTransitionComplete()}return}started.current=null;issued.current=false;if(lastSequence.current!=='idle'){lastSequence.current='idle';onTransitionSequence('idle')}stepEmbodiedMotion({delta,input,yaw:yaw.current,position:pos.current,velocity:velocity.current,target,bounds:BOUNDS,speed:2.7,acceleration:8,deceleration:11});if(avatar.current){avatar.current.position.copy(pos.current);avatar.current.rotation.y=yaw.current+Math.PI}const portrait=size.height>size.width,backDistance=portrait?0.1:0.18,eyeHeight=portrait?1.5:1.6;const desired=pos.current.clone().add(new THREE.Vector3(Math.sin(yaw.current)*backDistance,eyeHeight,Math.cos(yaw.current)*backDistance));camera.position.lerp(desired,1-Math.pow(0.00065,delta));const look=pos.current.clone().add(new THREE.Vector3(-Math.sin(yaw.current)*9.2,1.25+pitch.current,-Math.cos(yaw.current)*9.2));camera.lookAt(look);const candidates:readonly [Nearby,THREE.Vector3,number][]=[['orb',ORB,2.5],['ground',GROUND,2.8],['life-map',LIFE_MAP,2.8]];let next:Nearby=null,best=Infinity;for(const [name,p,r] of candidates){const d=Math.hypot(pos.current.x-p.x,pos.current.z-p.z);if(d<r&&d<best){next=name;best=d}}if(next!==last.current){last.current=next;onNearby(next)}});return null"""
new_rig = """  useFrame(({clock},delta)=>{
    if(transition!=='none'){
      if(started.current===null)started.current=clock.elapsedTime
      const duration=reducedMotion?0.9:transition==='life-map'?3.4:2.6
      const t=THREE.MathUtils.smootherstep(THREE.MathUtils.clamp((clock.elapsedTime-started.current)/duration,0,1),0,1)
      const opening:TransitionSequence=transition==='life-map'?'life-map:opening':'ground:opening'
      const traversal:TransitionSequence=transition==='life-map'?'life-map:traversal':'ground:traversal'
      const closing:TransitionSequence=transition==='life-map'?'life-map:closing':'ground:closing'
      const desired:TransitionSequence=t<0.16?opening:t<0.84?traversal:closing
      let phaseEmitted=false
      if(lastSequence.current==='idle'){
        lastSequence.current=opening;onTransitionSequence(opening);phaseEmitted=true
      }else if(lastSequence.current===opening&&desired!==opening){
        lastSequence.current=traversal;onTransitionSequence(traversal);phaseEmitted=true
      }else if(lastSequence.current===traversal&&desired===closing){
        lastSequence.current=closing;onTransitionSequence(closing);phaseEmitted=true
      }
      if(transition==='life-map'){
        camera.position.lerp(new THREE.Vector3(0,30,-30),1-Math.pow(0.002,delta));camera.lookAt(0,9+t*20,-18-t*20);useSceneStore.getState().setProgress(t)
      }else{
        camera.position.lerp(new THREE.Vector3(-5.2,-2,-13.35),1-Math.pow(0.002,delta));camera.lookAt(-5.2,-0.8,-14.6)
      }
      if(t>=1&&!issued.current&&lastSequence.current===closing&&!phaseEmitted){issued.current=true;onTransitionComplete()}
      return
    }
    started.current=null;issued.current=false
    if(lastSequence.current!=='idle'){lastSequence.current='idle';onTransitionSequence('idle')}
    stepEmbodiedMotion({delta,input,yaw:yaw.current,position:pos.current,velocity:velocity.current,target,bounds:BOUNDS,speed:2.7,acceleration:8,deceleration:11})
    if(avatar.current){avatar.current.position.copy(pos.current);avatar.current.rotation.y=yaw.current+Math.PI}
    const portrait=size.height>size.width,backDistance=portrait?0.1:0.18,eyeHeight=portrait?1.5:1.6
    const desired=pos.current.clone().add(new THREE.Vector3(Math.sin(yaw.current)*backDistance,eyeHeight,Math.cos(yaw.current)*backDistance))
    camera.position.lerp(desired,1-Math.pow(0.00065,delta))
    const look=pos.current.clone().add(new THREE.Vector3(-Math.sin(yaw.current)*9.2,1.25+pitch.current,-Math.cos(yaw.current)*9.2));camera.lookAt(look)
    const candidates:readonly [Nearby,THREE.Vector3,number][]=[['orb',ORB,2.5],['ground',GROUND,2.8],['life-map',LIFE_MAP,2.8]]
    let next:Nearby=null,best=Infinity
    for(const [name,p,r] of candidates){const d=Math.hypot(pos.current.x-p.x,pos.current.z-p.z);if(d<r&&d<best){next=name;best=d}}
    if(next!==last.current){last.current=next;onNearby(next)}
  });return null"""
replace(home, old_rig, new_rig)

replace(home, 'function PhysicalEnvironment(){return <Environment files={HOME_HDR} background={false} environmentIntensity={1.05} />}', 'function PhysicalEnvironment(){return <Environment files={HOME_HDR} background={false} environmentIntensity={1.22} />}')
replace(home, '<ambientLight intensity={0.3} color="#d0d7d3" />', '<ambientLight intensity={0.36} color="#d0d7d3" />')
replace(home, "<hemisphereLight args={['#8aa0a2','#101513',0.46]} />", "<hemisphereLight args={['#8aa0a2','#101513',0.52]} />")
replace(home, 'intensity={1.34} color="#d4e0df"', 'intensity={1.48} color="#d4e0df"')
replace(home, 'intensity={0.28} color="#68878c"', 'intensity={0.36} color="#68878c"')
replace(home, 'intensity={0.52} color="#ece6d8"', 'intensity={0.62} color="#ece6d8"')
replace(home, 'intensity={0.28} distance={7}', 'intensity={0.4} distance={7.5}')
replace(home, '<ContactShadows position={[0,0.035,-2.15]} opacity={0.56} scale={7} blur={2.15} far={4.5} resolution={256} frames={1} color="#020403" />', '<ContactShadows position={[0,0.03,-2.15]} opacity={0.24} scale={2.8} blur={3.2} far={1.8} resolution={256} frames={1} color="#020403" />')
replace(home, 'gl.toneMappingExposure=1.36', 'gl.toneMappingExposure=1.46')
replace(home, 'data-home-final-art-revision="v25-asymmetric-physical-certification-candidate"', 'data-home-final-art-revision="v26-open-court-integrated-relic-candidate"')

print('V26 coordinated repair applied successfully')
