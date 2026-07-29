#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const outRoot = process.argv[2] || '/tmp/urai-home-authored'
const receiptPath = process.argv[3] || path.join(outRoot, 'home-finalization-authored-source-v3.json')
fs.mkdirSync(outRoot, { recursive: true })
fs.mkdirSync(path.dirname(receiptPath), { recursive: true })

const MATERIALS = [
  mat('obsidian-stone', [0.035,0.055,0.058,1], [0.002,0.01,0.012], 0.34, 0.64),
  mat('living-slate', [0.09,0.16,0.145,1], [0.008,0.045,0.034], 0.16, 0.72),
  mat('warm-bronze', [0.33,0.18,0.08,1], [0.11,0.038,0.008], 0.72, 0.28),
  mat('cool-alloy', [0.085,0.13,0.18,1], [0.015,0.075,0.16], 0.76, 0.22),
  mat('memory-cyan', [0.11,0.62,0.58,0.88], [0.05,0.78,0.70], 0.18, 0.16, 'BLEND'),
  mat('memory-violet', [0.34,0.23,0.72,0.86], [0.31,0.16,0.82], 0.14, 0.18, 'BLEND'),
  mat('provenance-gold', [0.74,0.46,0.16,1], [0.36,0.13,0.02], 0.56, 0.26),
  mat('water-glass', [0.035,0.18,0.22,0.48], [0.02,0.18,0.25], 0.18, 0.06, 'BLEND'),
  mat('aura-glass', [0.16,0.67,0.78,0.16], [0.06,0.42,0.76], 0.05, 0.05, 'BLEND'),
  mat('moss', [0.075,0.25,0.14,1], [0.006,0.06,0.018], 0.04, 0.94),
  mat('ember', [0.64,0.16,0.055,0.84], [0.88,0.10,0.015], 0.08, 0.22, 'BLEND'),
  mat('bone-glass', [0.55,0.68,0.65,0.66], [0.08,0.18,0.17], 0.20, 0.22, 'BLEND'),
  mat('deep-velvet', [0.075,0.045,0.11,1], [0.035,0.008,0.06], 0.04, 0.86),
  mat('soft-ivory', [0.62,0.69,0.66,1], [0.035,0.06,0.055], 0.14, 0.52),
]

function writeAsset(fileName, built) {
  const target = path.join(outRoot, fileName)
  fs.writeFileSync(target, built.payload)
  const sha256 = crypto.createHash('sha256').update(built.payload).digest('hex')
  return { fileName, sha256, bytes: built.payload.length, ...built.metrics }
}

function buildHome() {
  const b = new Builder('URAI Authored Living Home Sanctuary V3')
  const stone=0,living=1,bronze=2,cool=3,cyan=4,violet=5,gold=6,water=7,aura=8,moss=9,ember=10,bone=11,velvet=12,ivory=13
  const root = b.group('home-sanctuary-root', {}, {
    assetContract:'urai-home-entry-chamber-v3', authoredArchitecture:true, authoredEmbodiment:true,
    mobileComposition:'open central sightline; readable Ground left and Life Map right; no foreground occluder',
    degradedFallback:'home-sanctuary-static-v1',
  })

  b.add('sanctuary-terrain', cylinder(8.9,0.30,96), stone, {t:[0,-0.30,-1.05],s:[1.05,1,0.92]}, {role:'grounded-terrain',lod:'mobile-primary'}, root)
  b.add('sanctuary-inner-earth', cylinder(5.45,0.18,88), living, {t:[0,-0.08,-1.0],s:[1.0,1,0.90]}, {role:'central-sanctuary-floor'}, root)
  b.add('sanctuary-foreground-landing', roundedSlab(5.2,1.85,0.20,0.42), living, {t:[0,-0.01,6.65]}, {role:'spawn-landing'}, root)

  const paths = [
    {name:'ground-descent-path',points:[[0,0.04,6.8],[-0.65,0.06,4.4],[-1.85,0.10,1.0],[-4.55,0.20,-6.45]],width:0.88,material:living},
    {name:'life-map-ascent-path',points:[[0,0.04,6.8],[0.65,0.06,4.4],[1.85,0.18,1.0],[4.55,0.52,-6.55]],width:0.84,material:cool},
    {name:'memory-garden-path',points:[[0,0.05,5.6],[0.05,0.08,2.9],[-0.08,0.11,-1.0],[0,0.15,-7.35]],width:0.44,material:moss},
  ]
  for (const p of paths) b.add(p.name, ribbon(p.points,p.width), p.material, {}, {role:'natural-travel-path'}, root)

  b.add('mirror-basin-rim', torus(1.82,0.11,80,12), bronze, {t:[0,0.10,-0.72],r:qEuler(Math.PI/2,0,0)}, {role:'orb-pedestal-basin'}, root)
  b.add('mirror-basin-water', cylinder(1.68,0.045,72), water, {t:[0,0.07,-0.72]}, {role:'reflective-water'}, root)
  b.add('orb-pedestal-lower', irregularStone(1.58,0.34,1.35,3), stone, {t:[0,0.18,-0.72]}, {role:'orb-pedestal'}, root)
  b.add('orb-pedestal-upper', irregularStone(0.94,0.24,0.82,8), bronze, {t:[0,0.47,-0.72]}, {role:'orb-anchor'}, root)
  b.add('sanctuary-heart-light', sphere(0.16,18,12), cyan, {t:[0,0.72,-0.72]}, {role:'sanctuary-heart'}, root)

  // Layered architecture stays behind the focal basin and preserves the central walkable sightline.
  const ribZ=[-3.2,-4.15,-5.1]
  ribZ.forEach((z,i)=>{
    const arch=b.group(`sanctuary-vault-${i+1}`,{t:[0,0,z],s:[1+i*0.07,1+i*0.06,1]}, {role:'authored-vault'}, root)
    for(let block=0;block<11;block++) {
      const t=block/10
      const a=Math.PI*(1-t)
      const x=Math.cos(a)*4.8
      const y=Math.sin(a)*4.2+0.15
      b.add(`sanctuary-vault-${i+1}-stone-${block+1}`, irregularStone(0.64,0.42,0.42,block+i*17), block%3===0?bronze:(i%2?cool:stone), {t:[x,y,0],r:qEuler(0,0,-a+Math.PI/2),s:[1,1,0.82]}, {role:'vault-masonry'}, arch)
    }
  })

  // Side groves frame rather than block the player view.
  const grove = [
    [-6.55,1.35,3.6,0.82],[-5.85,1.65,0.5,1.0],[-6.55,1.6,-3.0,0.92],[-6.1,1.75,-6.2,1.05],
    [6.55,1.35,3.6,0.82],[5.85,1.65,0.5,1.0],[6.55,1.6,-3.0,0.92],[6.1,1.75,-6.2,1.05],
  ]
  grove.forEach(([x,y,z,s],i)=>{
    b.add(`living-grove-trunk-${i+1}`, taperedBranch(0.22,0.42,3.4,14,0.18*(i%2?1:-1)), i%2?living:stone, {t:[x,y-0.45,z],s:[s,s,s]}, {role:'environmental-landmark'}, root)
    b.add(`living-grove-crown-${i+1}-a`, leafBlade(2.1,0.72,0.16,18), i%3===0?gold:moss, {t:[x+(i%2?0.35:-0.35),y+1.55,z],r:qEuler(0.08,i*0.47,i%2?0.5:-0.5),s:[s,s,s]}, {role:'environmental-canopy'}, root)
    b.add(`living-grove-crown-${i+1}-b`, leafBlade(1.7,0.58,0.13,16), living, {t:[x-(i%2?0.38:-0.38),y+1.15,z+0.18],r:qEuler(-0.1,i*0.31,i%2?-0.65:0.65),s:[s,s,s]}, {role:'environmental-canopy'}, root)
  })

  addPortalAlcove(b,root,'ground',[-4.7,0.22,-6.7],0.30,cyan,stone,bronze)
  addPortalAlcove(b,root,'life-map',[4.7,0.52,-6.8],-0.30,violet,cool,gold)

  const horizon=b.group('horizon-threshold-root',{t:[0,0,-8.95]}, {role:'readable-horizon-landmark'}, root)
  b.add('horizon-monolith-left', irregularStone(1.05,5.5,0.9,41), stone, {t:[-1.55,2.3,0],r:qEuler(0,0,-0.05)}, {role:'horizon-monolith'}, horizon)
  b.add('horizon-monolith-right', irregularStone(1.05,5.5,0.9,47), cool, {t:[1.55,2.3,0],r:qEuler(0,0,0.05)}, {role:'horizon-monolith'}, horizon)
  b.add('horizon-bridge', irregularStone(3.7,0.52,0.85,59), bronze, {t:[0,4.85,0]}, {role:'horizon-bridge'}, horizon)
  b.add('horizon-memory-veil', disc(1.28,64), aura, {t:[0,2.25,-0.42]}, {role:'distant-memory-veil'}, horizon)

  // Authored embodied presence: layered asymmetrical woven form, not a pawn, capsule, or lathe.
  const presence=b.group('embodied-presence-root',{t:[-2.15,0.02,-0.15],r:qEuler(0,0.26,0)}, {role:'private-embodied-presence'}, root)
  b.add('embodied-presence-cloak-back', cloakPanel(1.35,2.45,0.22,0.12), velvet, {t:[0,1.14,-0.06],r:qEuler(0,0.04,-0.02)}, {role:'woven-body'}, presence)
  b.add('embodied-presence-cloak-front-left', cloakPanel(0.72,2.18,0.16,-0.10), living, {t:[-0.28,1.06,0.14],r:qEuler(0,-0.13,0.08)}, {role:'woven-body'}, presence)
  b.add('embodied-presence-cloak-front-right', cloakPanel(0.72,2.18,0.16,0.10), bone, {t:[0.28,1.06,0.16],r:qEuler(0,0.13,-0.08)}, {role:'woven-body'}, presence)
  b.add('embodied-presence-shoulder-left', leafBlade(0.98,0.30,0.15,16), bronze, {t:[-0.48,1.96,0.04],r:qEuler(0.15,0.12,0.42)}, {role:'protective-shoulder'}, presence)
  b.add('embodied-presence-shoulder-right', leafBlade(0.98,0.30,0.15,16), cool, {t:[0.48,1.96,0.04],r:qEuler(-0.12,-0.12,-0.42)}, {role:'protective-shoulder'}, presence)
  b.add('embodied-presence-head-veil', elongatedSphere(0.31,0.43,0.26,24,18), ivory, {t:[0,2.46,0.02]}, {role:'head-veil'}, presence)
  b.add('embodied-presence-face-light', disc(0.18,40), aura, {t:[0,2.46,0.29]}, {role:'non-identifying-face-light'}, presence)
  b.add('embodied-presence-heart', sphere(0.13,20,14), cyan, {t:[0,1.62,0.33]}, {role:'private-heart'}, presence)
  b.add('embodied-presence-shadow', disc(0.62,48), water, {t:[0,0.03,0],r:qEuler(Math.PI/2,0,0),s:[1.25,0.72,1]}, {role:'ground-contact'}, presence)

  b.addAnimation('Home_Breathing',[
    anim('sanctuary-heart-light','scale',[0,1.6,3.2],[1,1,1,1.18,1.18,1.18,1,1,1]),
  ])
  b.addAnimation('Presence_Idle',[
    anim(presence,'translation',[0,1.8,3.6],[-2.15,0.02,-0.15,-2.15,0.075,-0.15,-2.15,0.02,-0.15]),
    anim('embodied-presence-heart','scale',[0,0.9,1.8],[1,1,1,1.18,1.18,1.18,1,1,1]),
  ])
  b.addAnimation('Presence_Privacy',[
    anim(presence,'scale',[0,0.7,1.4],[1,1,1,0.92,0.92,0.92,1,1,1]),
    anim('embodied-presence-face-light','scale',[0,0.7,1.4],[1,1,1,0.35,0.35,0.35,1,1,1]),
  ])
  b.addAnimation('Presence_Forming',[
    anim(presence,'scale',[0,1.2,2.4],[0.72,0.72,0.72,1.04,1.04,1.04,1,1,1]),
  ])

  // Anchors for dynamic personalized shrines and accessible interaction hit targets.
  const anchors=[[-5.25,0.02,3.0],[5.25,0.02,2.25],[-5.55,0.02,-1.45],[5.55,0.02,-2.55],[-5.2,0.02,-5.5],[5.2,0.02,-5.8]]
  anchors.forEach((p,i)=>b.group(`memory-place-anchor-${i+1}`,{t:p},{role:'personalized-place-anchor'},root))

  for(let i=0;i<18;i++) {
    const side=i%2?1:-1
    const row=Math.floor(i/2)
    const x=side*(2.7+(row%3)*0.55)
    const z=5.4-row*1.25
    b.add(`sanctuary-growth-${i+1}`, leafBlade(0.48+(i%4)*0.10,0.12,0.045,10), i%5===0?gold:moss, {t:[x,0.18,z],r:qEuler(0,i*0.51,side*0.18)}, {role:'restrained-growth'}, root)
  }
  for(let i=0;i<16;i++) {
    const a=(i/16)*Math.PI*2
    b.add(`sanctuary-firefly-${i+1}`, sphere(0.022+(i%3)*0.006,8,6), i%4===0?gold:cyan, {t:[Math.cos(a)*5.6,0.9+(i%5)*0.38,Math.sin(a)*4.5-1.2]}, {role:'ambient-particle-anchor'}, root)
  }

  b.rootExtras = {
    assetContract:'urai-home-entry-chamber-v3',
    authoredArchitecture:true,
    authoredEmbodiment:true,
    namedInteractionAnchors:true,
    animationClips:4,
    anchors:{orb:[0,0.72,-0.72],ground:[-4.7,0.22,-6.7],lifeMap:[4.7,0.52,-6.8],embodiedSelf:[-2.15,0.02,-0.15]},
    visualReviewContract:'desktop portrait landscape reduced-motion forced-colors no-webgl asset-failure',
  }
  return b.finish()
}

function addPortalAlcove(b,parent,prefix,position,yaw,energyMat,structureMat,accentMat) {
  const [x,y,z]=position
  const root=b.group(`${prefix}-alcove-root`,{t:[x,y,z],r:qEuler(0,yaw,0)},{role:`${prefix}-portal-anchor`},parent)
  for(let i=0;i<9;i++) {
    const t=i/8
    const a=Math.PI*(1-t)
    b.add(`${prefix}-alcove-arch-stone-${i+1}`, irregularStone(0.52,0.42,0.55,i+(prefix==='ground'?100:200)), structureMat, {t:[Math.cos(a)*1.9,1.82+Math.sin(a)*1.76,0],r:qEuler(0,0,-a+Math.PI/2)}, {role:`${prefix}-portal-masonry`},root)
  }
  b.add(`${prefix}-alcove-left`, irregularStone(0.56,3.25,0.72,prefix==='ground'?301:401), structureMat, {t:[-1.9,0.25,0]}, {role:`${prefix}-portal-pillar`},root)
  b.add(`${prefix}-alcove-right`, irregularStone(0.56,3.25,0.72,prefix==='ground'?302:402), structureMat, {t:[1.9,0.25,0]}, {role:`${prefix}-portal-pillar`},root)
  b.add(`${prefix}-alcove-energy`, torusArc(1.55,0.045,0,Math.PI,64,8), energyMat, {t:[0,1.82,0.06]}, {role:`${prefix}-portal-energy`},root)
  b.add(`${prefix}-threshold-plinth`, roundedSlab(3.9,1.35,0.24,0.24), accentMat, {t:[0,-0.12,0.54]}, {role:`${prefix}-threshold`},root)
  b.add(`${prefix}-portal-veil`, disc(1.42,64), energyMat, {t:[0,1.82,-0.20]}, {role:`${prefix}-portal-veil`},root)
}

function buildPortal() {
  const b = new Builder('URAI Portal Master Authored Architecture V3')
  const stone=0,living=1,bronze=2,cool=3,cyan=4,violet=5,gold=6,water=7,aura=8
  const root=b.group('portal-root',{}, {assetContract:'urai-portal-master-v3',states:['closed','available','attention','active','opening','traversal','closing']})
  const left=b.group('portal-pillar-left',{t:[-1.72,-0.35,0]},{role:'architectural-pillar'},root)
  const right=b.group('portal-pillar-right',{t:[1.72,-0.35,0]},{role:'architectural-pillar'},root)
  for(let i=0;i<4;i++) {
    b.add(`portal-left-block-${i+1}`,irregularStone(0.62,0.78,0.72,510+i),i===3?bronze:stone,{t:[0,-0.88+i*0.76,0],r:qEuler(0,0,i%2?0.035:-0.035)},{role:'portal-masonry'},left)
    b.add(`portal-right-block-${i+1}`,irregularStone(0.62,0.78,0.72,520+i),i===3?bronze:stone,{t:[0,-0.88+i*0.76,0],r:qEuler(0,0,i%2?-0.035:0.035)},{role:'portal-masonry'},right)
  }
  const arch=b.group('portal-architectural-arch',{}, {role:'destination-neutral-frame'},root)
  for(let i=0;i<11;i++) {
    const t=i/10
    const a=Math.PI*(1-t)
    b.add(`portal-arch-block-${i+1}`,irregularStone(0.54,0.40,0.66,540+i),i===5?gold:bronze,{t:[Math.cos(a)*1.72,1.05+Math.sin(a)*1.72,0],r:qEuler(0,0,-a+Math.PI/2)},{role:i===5?'portal-keystone':'portal-masonry'},arch)
  }
  b.add('portal-energy-crown',torusArc(1.43,0.043,0,Math.PI,72,8),cyan,{t:[0,1.05,0.08]},{role:'state-energy'},root)
  b.add('portal-threshold-stone',roundedSlab(3.95,0.98,0.28,0.22),living,{t:[0,-1.82,0.22]},{role:'environmental-anchor'},root)
  for(let i=0;i<4;i++) b.add(`portal-step-${i+1}`,roundedSlab(3.5-i*0.30,0.54,0.14,0.12),i%2?stone:living,{t:[0,-2.03-i*0.14,0.34+i*0.22]},{role:'portal-approach-step'},root)
  const depth=[]
  for(let i=0;i<4;i++) depth.push(b.add(`portal-depth-${i+1}`,torusArc(1.22-i*0.08,0.032,0,Math.PI,64,8),i%2?violet:cyan,{t:[0,1.05,-0.16-i*0.20]},{role:'internal-depth-layer'},root))
  const membrane=b.add('portal-membrane',disc(1.24,64),water,{t:[0,1.05,-0.94]},{role:'traversal-plane'},root)
  const veil=b.add('portal-inner-veil',disc(1.08,56),aura,{t:[0,1.05,-1.02]},{role:'traversal-depth'},root)
  for(let i=0;i<12;i++) {
    const a=(i/12)*Math.PI
    b.add(`portal-particle-anchor-${i+1}`,sphere(0.04,10,8),a<Math.PI/2?cyan:violet,{t:[Math.cos(a)*1.96,1.02+Math.sin(a)*1.80,0.20]},{role:'particle-anchor'},root)
  }
  b.addAnimation('Portal_Closed',[
    anim(membrane,'scale',[0,1],[0.05,0.05,0.05,0.05,0.05,0.05]),
    anim(veil,'scale',[0,1],[0.02,0.02,0.02,0.02,0.02,0.02]),
  ])
  b.addAnimation('Portal_Available',[
    anim(membrane,'scale',[0,0.8,1.6],[0.76,0.76,0.76,0.87,0.87,0.87,0.76,0.76,0.76]),
    anim(veil,'scale',[0,0.8,1.6],[0.68,0.68,0.68,0.82,0.82,0.82,0.68,0.68,0.68]),
  ])
  b.addAnimation('Portal_Attention',[anim(root,'scale',[0,0.35,0.7],[1,1,1,1.05,1.05,1.05,1,1,1])])
  b.addAnimation('Portal_Active',[anim(root,'translation',[0,0.6,1.2],[0,0,0,0,0.08,0,0,0,0])])
  b.addAnimation('Portal_Opening',[
    anim(membrane,'scale',[0,0.9],[0.10,0.10,0.10,1,1,1]),
    anim(veil,'scale',[0,0.9],[0.04,0.04,0.04,1.12,1.12,1.12]),
    ...depth.map((node,i)=>anim(node,'translation',[0,0.9],[0,1.05,-0.16-i*0.20,0,1.05,-0.36-i*0.30])),
  ])
  b.addAnimation('Portal_Traversal',[
    anim(membrane,'scale',[0,0.45,0.9],[1,1,1,1.18,1.18,1.18,1,1,1]),
    anim(veil,'scale',[0,0.45,0.9],[1,1,1,1.32,1.32,1.32,1,1,1]),
  ])
  b.addAnimation('Portal_Closing',[
    anim(membrane,'scale',[0,0.9],[1,1,1,0.08,0.08,0.08]),
    anim(veil,'scale',[0,0.9],[1,1,1,0.04,0.04,0.04]),
    ...depth.map((node,i)=>anim(node,'translation',[0,0.9],[0,1.05,-0.36-i*0.30,0,1.05,-0.16-i*0.20])),
  ])
  b.rootExtras={assetContract:'urai-portal-master-v3',namedNodes:true,animationClips:7,mobileReadableSilhouette:true,reducedMotionContract:'hold final keyframe without oscillation'}
  return b.finish()
}

function buildOrb() {
  const b = new Builder('URAI Orb Companion Authored State Rig V3')
  const living=1,bronze=2,cool=3,cyan=4,violet=5,gold=6,aura=8,ember=10,bone=11
  const root=b.group('orb-root',{}, {assetContract:'urai-orb-avatar-v3'})
  const core=b.add('orb-core',elongatedSphere(0.25,0.25,0.23,30,22),gold,{}, {role:'companion-core'},root)
  const heart=b.add('orb-heart',elongatedSphere(0.15,0.18,0.14,24,18),cyan,{s:[0.82,1.05,0.82]}, {role:'state-heart'},root)
  const auraNode=b.add('orb-aura',sphere(0.49,30,20),aura,{s:[1,1,1]}, {role:'state-aura'},root)
  const petals=[]
  for(let i=0;i<8;i++) {
    const a=(i/8)*Math.PI*2
    petals.push(b.add(`orb-petal-${i+1}`,leafBlade(0.54,0.17,0.07,16),i%3===0?bronze:(i%2?cool:living),{t:[Math.cos(a)*0.25,Math.sin(a)*0.25,0],r:qEuler(0.22*Math.sin(a),0.18*Math.cos(a),a-Math.PI/2),s:[1,1,1]},{role:'protective-petal'},root))
  }
  const orbitA=b.add('orb-orbit-a',torus(0.49,0.018,72,8),cyan,{r:qEuler(0.7,0.2,0.1)},{role:'orbital-state-ring'},root)
  const orbitB=b.add('orb-orbit-b',torus(0.62,0.015,72,8),violet,{r:qEuler(1.3,0.25,0.8)},{role:'orbital-state-ring'},root)
  const orbitC=b.add('orb-orbit-c',torus(0.72,0.010,72,8),gold,{r:qEuler(0.3,1.1,0.6)},{role:'guidance-orbit'},root)
  for(let i=0;i<6;i++) {
    const a=(i/6)*Math.PI*2
    b.add(`orb-satellite-${i+1}`,sphere(0.036+(i%2)*0.009,12,8),i%3===0?bone:(i%2?cyan:gold),{t:[Math.cos(a)*0.72,Math.sin(a)*0.50,Math.sin(a*2)*0.24]},{role:'state-particle-anchor'},root)
  }
  const states=[
    ['Orb_Resting',0.94,-0.04,0.16,'calm'],['Orb_Idle',1.00,0.04,0.30,'idle'],['Orb_Attention',1.12,0.13,0.68,'attention'],
    ['Orb_Listening',1.04,-0.03,0.48,'listening'],['Orb_Thinking',1.02,0.09,1.25,'thinking'],['Orb_Speaking',1.15,0.11,0.84,'speaking'],
    ['Orb_Guiding',1.08,0.20,1.02,'guiding'],['Orb_Reflecting',0.98,-0.11,0.44,'reflecting'],['Orb_Calming',0.92,-0.06,0.18,'calming'],
    ['Orb_Privacy',0.88,0.02,0.10,'privacy'],['Orb_Degraded',0.84,-0.15,0.06,'degraded'],['Orb_Transition',1.20,0.26,1.72,'transition'],
  ]
  for(const [name,scale,y,turns,state] of states) {
    const spin=Number(turns)*Math.PI*2
    const petalSpread=state==='privacy'?0.76:state==='attention'?1.18:state==='transition'?1.28:1
    const channels=[
      anim(root,'translation',[0,0.6,1.2],[0,0,0,0,Number(y),0,0,0,0]),
      anim(root,'scale',[0,0.6,1.2],[1,1,1,Number(scale),Number(scale),Number(scale),1,1,1]),
      anim(orbitA,'rotation',[0,1.2],[0,0,0,1,...qEuler(0,0,spin)]),
      anim(orbitB,'rotation',[0,1.2],[0,0,0,1,...qEuler(spin*0.72,0,0)]),
      anim(orbitC,'rotation',[0,1.2],[0,0,0,1,...qEuler(0,spin*0.52,0)]),
      anim(auraNode,'scale',[0,0.6,1.2],[0.88,0.88,0.88,Number(scale)*1.18,Number(scale)*1.18,Number(scale)*1.18,0.88,0.88,0.88]),
      anim(heart,'scale',[0,0.3,0.6,0.9,1.2],[0.82,1.02,0.82,0.98,1.25,0.98,0.82,1.02,0.82,0.98,1.25,0.98,0.82,1.02,0.82]),
    ]
    petals.forEach((node,i)=>channels.push(anim(node,'scale',[0,0.6,1.2],[1,1,1,petalSpread,petalSpread,petalSpread,1,1,1])))
    b.addAnimation(name,channels)
  }
  b.rootExtras={assetContract:'urai-orb-avatar-v3',namedNodes:true,animationClips:12,stateNames:states.map(([name])=>name),routeIndependent:true,reducedMotionContract:'hold first or final state keyframe'}
  return b.finish()
}

class Builder {
  constructor(sceneName){this.sceneName=sceneName;this.meshes=[];this.nodes=[];this.roots=[];this.materials=MATERIALS;this.geom=[];this.animations=[];this.rootExtras={};this.nameToNode=new Map()}
  group(name,transform={},extras={},parent=null){const i=this.nodes.length;this.nodes.push(node(name,undefined,transform,extras));this.nameToNode.set(name,i);if(parent===null)this.roots.push(i);else{this.nodes[parent].children??=[];this.nodes[parent].children.push(i)}return i}
  add(name,geometry,material,transform={},extras={},parent=null){const mi=this.meshes.length;this.meshes.push({name,primitives:[{attributes:{POSITION:null,NORMAL:null},indices:null,material}]});this.geom.push(geometry);const ni=this.nodes.length;this.nodes.push(node(name,mi,transform,extras));this.nameToNode.set(name,ni);if(parent===null)this.roots.push(ni);else{this.nodes[parent].children??=[];this.nodes[parent].children.push(ni)}return ni}
  resolveNode(target){if(typeof target==='number')return target;const found=this.nameToNode.get(target);if(found===undefined)throw new Error(`Unknown animation node: ${target}`);return found}
  addAnimation(name,channels){this.animations.push({name,channels:channels.map((ch)=>({...ch,node:this.resolveNode(ch.node)}))})}
  finish(){
    const binParts=[],bufferViews=[],accessors=[];let offset=0
    const append=(array,target,spec)=>{const bytes=Buffer.from(array.buffer,array.byteOffset,array.byteLength);const aligned=align4(offset);if(aligned>offset)binParts.push(Buffer.alloc(aligned-offset));offset=aligned;const vi=bufferViews.length;bufferViews.push({buffer:0,byteOffset:offset,byteLength:bytes.length,...(target?{target}:{})});binParts.push(bytes);offset+=bytes.length;accessors.push({bufferView:vi,...spec});return accessors.length-1}
    this.geom.forEach((g,i)=>{const p=new Float32Array(g.positions),n=new Float32Array(g.normals),maxIndex=Math.max(...g.indices);const idx=maxIndex>65535?new Uint32Array(g.indices):new Uint16Array(g.indices);const pa=append(p,34962,{componentType:5126,count:p.length/3,type:'VEC3',min:minVec3(p),max:maxVec3(p)});const na=append(n,34962,{componentType:5126,count:n.length/3,type:'VEC3'});const ia=append(idx,34963,{componentType:maxIndex>65535?5125:5123,count:idx.length,type:'SCALAR',min:[0],max:[maxIndex]});Object.assign(this.meshes[i].primitives[0].attributes,{POSITION:pa,NORMAL:na});this.meshes[i].primitives[0].indices=ia})
    const animations=this.animations.map((clip)=>{const samplers=[],channels=[];for(const ch of clip.channels){const input=new Float32Array(ch.times),output=new Float32Array(ch.values);const inputAccessor=append(input,null,{componentType:5126,count:ch.times.length,type:'SCALAR',min:[Math.min(...ch.times)],max:[Math.max(...ch.times)]});const components=ch.path==='rotation'?4:3;const outputAccessor=append(output,null,{componentType:5126,count:ch.values.length/components,type:components===4?'VEC4':'VEC3'});const si=samplers.length;samplers.push({input:inputAccessor,output:outputAccessor,interpolation:'LINEAR'});channels.push({sampler:si,target:{node:ch.node,path:ch.path}})}return{name:clip.name,samplers,channels}})
    const bin=Buffer.concat(binParts)
    const json={asset:{version:'2.0',generator:'URAI Labs authored sanctuary deterministic pipeline v3',extras:{source:'scripts/author-home-finalization-assets.mjs'}},scene:0,scenes:[{name:this.sceneName,nodes:this.roots,extras:this.rootExtras}],nodes:this.nodes,meshes:this.meshes,materials:this.materials,buffers:[{byteLength:bin.length}],bufferViews,accessors,...(animations.length?{animations}:{})}
    const payload=encodeGlb(json,bin)
    const triangles=this.geom.reduce((sum,g)=>sum+Math.floor(g.indices.length/3),0)
    return{payload,metrics:{triangleCount:triangles,nodes:this.nodes.length,materials:this.materials.length,animations:animations.length,boundsMeters:aggregateBounds(this.geom,this.nodes,this.meshes)}}
  }
}

function node(name,mesh,transform={},extras={}){return{name,...(mesh===undefined?{}:{mesh}),...(transform.t?{translation:transform.t}:{}),...(transform.r?{rotation:transform.r}:{}),...(transform.s?{scale:transform.s}:{}),...(Object.keys(extras).length?{extras}:{})}}
function anim(node,path,times,values){return{node,path,times,values}}
function mat(name,base,emissive,metallic,roughness,alphaMode='OPAQUE'){return{name,pbrMetallicRoughness:{baseColorFactor:base,metallicFactor:metallic,roughnessFactor:roughness},emissiveFactor:emissive,alphaMode,doubleSided:true}}
function box(x,y,z){const hx=x/2,hy=y/2,hz=z/2,pts=[[-hx,-hy,-hz],[hx,-hy,-hz],[hx,hy,-hz],[-hx,hy,-hz],[-hx,-hy,hz],[hx,-hy,hz],[hx,hy,hz],[-hx,hy,hz]],faces=[[0,1,2,3,[0,0,-1]],[4,7,6,5,[0,0,1]],[0,4,5,1,[0,-1,0]],[3,2,6,7,[0,1,0]],[1,5,6,2,[1,0,0]],[0,3,7,4,[-1,0,0]]],positions=[],normals=[],indices=[];for(const f of faces){const base=positions.length/3;for(let i=0;i<4;i++){positions.push(...pts[f[i]]);normals.push(...f[4])}indices.push(base,base+1,base+2,base,base+2,base+3)}return{positions,normals,indices}}
function roundedSlab(x,z,y,corner=0.2){const g=box(x,y,z);for(let i=0;i<g.positions.length;i+=3){const px=g.positions[i],pz=g.positions[i+2];const sx=Math.sign(px),sz=Math.sign(pz);const ax=Math.abs(px),az=Math.abs(pz);if(ax>x/2-corner&&az>z/2-corner){const dx=ax-(x/2-corner),dz=az-(z/2-corner),l=Math.hypot(dx,dz)||1;g.positions[i]=sx*((x/2-corner)+dx/l*corner);g.positions[i+2]=sz*((z/2-corner)+dz/l*corner)}}return g}
function cylinder(radius,height,segments=32){return frustum(radius,radius,height,segments)}
function frustum(top,bottom,height,segments=32){const positions=[],normals=[],indices=[];for(let i=0;i<=segments;i++){const a=(i/segments)*Math.PI*2,c=Math.cos(a),s=Math.sin(a),slope=(bottom-top)/height,nl=Math.hypot(c,s,slope);positions.push(c*bottom,-height/2,s*bottom,c*top,height/2,s*top);normals.push(c/nl,slope/nl,s/nl,c/nl,slope/nl,s/nl)}for(let i=0;i<segments;i++){const a=i*2,b=a+1,c=a+2,d=a+3;indices.push(a,c,d,a,d,b)}const bc=positions.length/3;positions.push(0,-height/2,0);normals.push(0,-1,0);const tc=positions.length/3;positions.push(0,height/2,0);normals.push(0,1,0);for(let i=0;i<segments;i++){const next=((i+1)%segments)*2;indices.push(bc,next,i*2);indices.push(tc,i*2+1,next+1)}return{positions,normals,indices}}
function taperedBranch(top,bottom,height,segments=14,bend=0){const g=frustum(top,bottom,height,segments);for(let i=0;i<g.positions.length;i+=3){const y=g.positions[i+1]+height/2;g.positions[i]+=bend*(y/height)*(y/height)}return g}
function sphere(radius,w=24,h=16){return elongatedSphere(radius,radius,radius,w,h)}
function elongatedSphere(rx,ry,rz,w=24,h=16){const positions=[],normals=[],indices=[];for(let y=0;y<=h;y++){const v=y/h,phi=v*Math.PI;for(let x=0;x<=w;x++){const u=x/w,theta=u*Math.PI*2,nx=Math.sin(phi)*Math.cos(theta),ny=Math.cos(phi),nz=Math.sin(phi)*Math.sin(theta);positions.push(nx*rx,ny*ry,nz*rz);const qx=nx/rx,qy=ny/ry,qz=nz/rz,l=Math.hypot(qx,qy,qz)||1;normals.push(qx/l,qy/l,qz/l)}}for(let y=0;y<h;y++)for(let x=0;x<w;x++){const a=y*(w+1)+x,b=a+w+1;indices.push(a,b,a+1,b,b+1,a+1)}return{positions,normals,indices}}
function torus(radius,tube,radial=64,tubular=10){return torusArc(radius,tube,0,Math.PI*2,radial,tubular,true)}
function torusArc(radius,tube,start,end,radial=64,tubular=10,closed=false){const positions=[],normals=[],indices=[],rings=closed?radial:radial+1;for(let i=0;i<rings;i++){const u=start+(i/(closed?radial:radial))*(end-start),cu=Math.cos(u),su=Math.sin(u);for(let j=0;j<tubular;j++){const v=(j/tubular)*Math.PI*2,cv=Math.cos(v),sv=Math.sin(v);positions.push((radius+tube*cv)*cu,(radius+tube*cv)*su,tube*sv);normals.push(cv*cu,cv*su,sv)}}const maxI=closed?radial:radial;for(let i=0;i<maxI;i++){const ni=closed?(i+1)%radial:i+1;for(let j=0;j<tubular;j++){const nj=(j+1)%tubular,a=i*tubular+j,b=ni*tubular+j,c=ni*tubular+nj,d=i*tubular+nj;indices.push(a,b,c,a,c,d)}}return{positions,normals,indices}}
function disc(radius,segments=48){const positions=[0,0,0],normals=[0,0,1],indices=[];for(let i=0;i<=segments;i++){const a=(i/segments)*Math.PI*2;positions.push(Math.cos(a)*radius,Math.sin(a)*radius,0);normals.push(0,0,1)}for(let i=1;i<=segments;i++)indices.push(0,i,i+1);return{positions,normals,indices}}
function ribbon(points,width){const positions=[],normals=[],indices=[];for(let i=0;i<points.length;i++){const p=points[i],prev=points[Math.max(0,i-1)],next=points[Math.min(points.length-1,i+1)],dx=next[0]-prev[0],dz=next[2]-prev[2],len=Math.hypot(dx,dz)||1,nx=-dz/len,nz=dx/len;positions.push(p[0]+nx*width/2,p[1],p[2]+nz*width/2,p[0]-nx*width/2,p[1],p[2]-nz*width/2);normals.push(0,1,0,0,1,0)}for(let i=0;i<points.length-1;i++){const a=i*2,b=a+1,c=a+2,d=a+3;indices.push(a,c,d,a,d,b)}return{positions,normals,indices}}
function leafBlade(length,width,depth=0.08,segments=16){const positions=[],normals=[],indices=[];for(let side=0;side<2;side++){const z=side?depth/2:-depth/2,nz=side?1:-1;for(let i=0;i<=segments;i++){const t=i/segments,y=(t-0.5)*length,w=Math.sin(Math.PI*t)*width;positions.push(-w,y,z,w,y,z);normals.push(0,0,nz,0,0,nz)}}const row=segments+1;for(let side=0;side<2;side++)for(let i=0;i<segments;i++){const base=side*row*2+i*2,a=base,b=base+1,c=base+2,d=base+3;if(side)indices.push(a,c,d,a,d,b);else indices.push(a,d,c,a,b,d)}for(let i=0;i<=segments;i++){const front=row*2+i*2,back=i*2;indices.push(back,front,front+1,back,front+1,back+1)}return{positions,normals:recalculateNormals(positions,indices),indices}}
function cloakPanel(width,height,depth=0.18,skew=0){const hw=width/2,hh=height/2;const front=[[-hw*0.72,hh,depth/2],[hw*0.72,hh,depth/2],[hw,hh*0.18,depth/2],[hw*0.78,-hh,depth/2],[0,-hh*0.84,depth/2],[-hw*0.78,-hh,depth/2],[-hw,hh*0.18,depth/2]].map(([x,y,z])=>[x+skew*(hh-y)/height,y,z]);return extrudedPolygon(front,depth)}
function irregularStone(width,height,depth,seed=1){const r=(n)=>pseudo(seed+n)-0.5,hw=width/2,hh=height/2,hd=depth/2;const pts=[[-hw*(0.90+r(1)*0.16),-hh*(0.92+r(2)*0.14),-hd*(0.92+r(3)*0.12)],[hw*(0.94+r(4)*0.12),-hh*(0.88+r(5)*0.18),-hd*(0.94+r(6)*0.10)],[hw*(0.90+r(7)*0.16),hh*(0.90+r(8)*0.16),-hd*(0.90+r(9)*0.14)],[-hw*(0.94+r(10)*0.12),hh*(0.92+r(11)*0.14),-hd*(0.96+r(12)*0.08)],[-hw*(0.92+r(13)*0.14),-hh*(0.90+r(14)*0.16),hd*(0.94+r(15)*0.10)],[hw*(0.90+r(16)*0.16),-hh*(0.94+r(17)*0.12),hd*(0.90+r(18)*0.14)],[hw*(0.94+r(19)*0.12),hh*(0.88+r(20)*0.18),hd*(0.96+r(21)*0.08)],[-hw*(0.90+r(22)*0.16),hh*(0.94+r(23)*0.12),hd*(0.92+r(24)*0.12)]];return polyhedronFromBoxPoints(pts)}
function extrudedPolygon(front,depth){const n=front.length,positions=[],indices=[];for(const p of front)positions.push(p[0],p[1],depth/2);for(const p of front)positions.push(p[0],p[1],-depth/2);for(let i=1;i<n-1;i++){indices.push(0,i,i+1,n,n+i+1,n+i)}for(let i=0;i<n;i++){const j=(i+1)%n;indices.push(i,j,n+j,i,n+j,n+i)}return{positions,normals:recalculateNormals(positions,indices),indices}}
function polyhedronFromBoxPoints(pts){const positions=pts.flat(),indices=[0,1,2,0,2,3,4,7,6,4,6,5,0,4,5,0,5,1,3,2,6,3,6,7,1,5,6,1,6,2,0,3,7,0,7,4];return{positions,normals:recalculateNormals(positions,indices),indices}}
function recalculateNormals(positions,indices){const normals=new Array(positions.length).fill(0);for(let i=0;i<indices.length;i+=3){const ia=indices[i]*3,ib=indices[i+1]*3,ic=indices[i+2]*3,ax=positions[ib]-positions[ia],ay=positions[ib+1]-positions[ia+1],az=positions[ib+2]-positions[ia+2],bx=positions[ic]-positions[ia],by=positions[ic+1]-positions[ia+1],bz=positions[ic+2]-positions[ia+2],nx=ay*bz-az*by,ny=az*bx-ax*bz,nz=ax*by-ay*bx;for(const k of [ia,ib,ic]){normals[k]+=nx;normals[k+1]+=ny;normals[k+2]+=nz}}for(let i=0;i<normals.length;i+=3){const l=Math.hypot(normals[i],normals[i+1],normals[i+2])||1;normals[i]/=l;normals[i+1]/=l;normals[i+2]/=l}return normals}
function pseudo(n){const x=Math.sin(n*12.9898)*43758.5453;return x-Math.floor(x)}
function qEuler(x=0,y=0,z=0){const c1=Math.cos(x/2),c2=Math.cos(y/2),c3=Math.cos(z/2),s1=Math.sin(x/2),s2=Math.sin(y/2),s3=Math.sin(z/2),q=[s1*c2*c3+c1*s2*s3,c1*s2*c3-s1*c2*s3,c1*c2*s3+s1*s2*c3,c1*c2*c3-s1*s2*s3],l=Math.hypot(...q)||1;return q.map(v=>v/l)}
function encodeGlb(json,bin){const jb=pad4(Buffer.from(JSON.stringify(json),'utf8'),0x20),bb=pad4(bin,0),total=12+8+jb.length+8+bb.length,h=Buffer.alloc(12),jh=Buffer.alloc(8),bh=Buffer.alloc(8);h.writeUInt32LE(0x46546c67,0);h.writeUInt32LE(2,4);h.writeUInt32LE(total,8);jh.writeUInt32LE(jb.length,0);jh.writeUInt32LE(0x4e4f534a,4);bh.writeUInt32LE(bb.length,0);bh.writeUInt32LE(0x004e4942,4);return Buffer.concat([h,jh,jb,bh,bb])}
function pad4(buf,pad){const n=(4-buf.length%4)%4;return n?Buffer.concat([buf,Buffer.alloc(n,pad)]):buf}
function align4(n){return n+((4-n%4)%4)}
function minVec3(a){const o=[Infinity,Infinity,Infinity];for(let i=0;i<a.length;i+=3){o[0]=Math.min(o[0],a[i]);o[1]=Math.min(o[1],a[i+1]);o[2]=Math.min(o[2],a[i+2])}return o}
function maxVec3(a){const o=[-Infinity,-Infinity,-Infinity];for(let i=0;i<a.length;i+=3){o[0]=Math.max(o[0],a[i]);o[1]=Math.max(o[1],a[i+1]);o[2]=Math.max(o[2],a[i+2])}return o}
function aggregateBounds(geom,nodes){const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];geom.forEach((g,mi)=>{const nodeIndex=nodes.findIndex(n=>n.mesh===mi),n=nodes[nodeIndex]||{},t=n.translation||[0,0,0],s=n.scale||[1,1,1];for(let i=0;i<g.positions.length;i+=3){for(let a=0;a<3;a++){const v=g.positions[i+a]*s[a]+t[a];min[a]=Math.min(min[a],v);max[a]=Math.max(max[a],v)}}});return{min:min.map(round),max:max.map(round),size:max.map((v,i)=>round(v-min[i]))}}
function round(v){return Number(v.toFixed(4))}

const authored=[]
authored.push(writeAsset('home-entry-chamber-v1.glb',buildHome()))
authored.push(writeAsset('portal-ring-master-v1.glb',buildPortal()))
authored.push(writeAsset('urai-orb-avatar-v1.glb',buildOrb()))
const sourceReceipt={
  schemaVersion:3,
  sourceId:'urai-home-authored-sanctuary-source-v3',
  authoredBy:'URAI Labs',
  ownership:'URAI Labs proprietary original geometry and animation authored for PR #952',
  license:'URAI Labs internal proprietary; redistribution governed by repository license and asset receipts',
  tool:'deterministic dependency-free Node.js glTF 2.0 authoring pipeline v3',
  generator:'scripts/author-home-finalization-assets.mjs',
  coordinateSystem:'glTF right-handed Y-up, meters',
  releaseBoundary:'review candidate only until exact-head visual evidence, governance decisions, manifest promotion, merge, and production verification complete',
  assets:authored,
}
fs.writeFileSync(receiptPath,JSON.stringify(sourceReceipt,null,2)+'\n')
console.log(JSON.stringify(sourceReceipt,null,2))
