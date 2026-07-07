#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const outRoot = path.join(root, 'urai-tier1', 'public', 'assets', 'urai', 'spatial')
const manifestPath = path.join(outRoot, 'asset-forge-manifest.json')

const modelAssets = [
  ['entry-chamber-shell-v1','entry-chamber','/','entry-chamber/models/entry-chamber-shell-v1.gltf','chamber'],
  ['entry-floor-ring-v1','entry-chamber','/','entry-chamber/models/entry-floor-ring-v1.gltf','ring'],
  ['central-orb-v1','entry-chamber','/','entry-chamber/models/central-orb-v1.gltf','orb'],
  ['universal-portal-ring-v1','shared','all','shared/models/universal-portal-ring-v1.gltf','portal'],
  ['ground-descent-hatch-v1','entry-chamber','/ground','entry-chamber/models/ground-descent-hatch-v1.gltf','hatch'],
  ['ground-room-shell-v1','ground-room','/ground','ground-room/models/ground-room-shell-v1.gltf','chamber'],
  ['ground-terminal-v1','ground-room','/ground','ground-room/models/ground-terminal-v1.gltf','panel'],
  ['agent-source-station-v1','ground-room','/ground','ground-room/models/agent-source-station-v1.gltf','station'],
  ['life-map-sky-dome-v1','life-map-sky','/life-map','life-map/models/life-map-sky-dome-v1.gltf','sky'],
  ['star-memory-node-v1','life-map-sky','/life-map','life-map/models/star-memory-node-v1.gltf','star'],
  ['focus-star-tunnel-v1','focus-star','/focus','focus-star/models/focus-star-tunnel-v1.gltf','tunnel'],
  ['replay-film-portal-v1','replay-portal','/replay','replay-portal/models/replay-film-portal-v1.gltf','film'],
  ['passport-identity-plinth-v1','passport-room','/passport','passport-room/models/passport-identity-plinth-v1.gltf','plinth'],
  ['status-control-board-v1','status-room','/status','status-room/models/status-control-board-v1.gltf','board'],
]

const textures = [
  ['hologram-panel-material-v1','shared','all','shared/textures/hologram-panel-material-v1.svg','#071733','#65e7ff','#8a5cff'],
  ['dark-metal-panel-material-v1','shared','all','shared/textures/dark-metal-panel-material-v1.svg','#05070d','#182033','#4b556b'],
  ['gold-trim-material-v1','shared','all','shared/textures/gold-trim-material-v1.svg','#1d1207','#d7a950','#fff0a8'],
  ['cosmic-glass-material-v1','shared','all','shared/textures/cosmic-glass-material-v1.svg','#061024','#2bd9ff','#8f5cff'],
  ['energy-particle-sprite-v1','shared','all','shared/particles/energy-particle-sprite-v1.svg','#000000','#7ce8ff','#7ce8ff'],
  ['star-particle-sprite-v1','shared','all','shared/particles/star-particle-sprite-v1.svg','#000000','#fff4b8','#fff4b8'],
]

for (const [id, , , rel, kind] of modelAssets) write(rel, JSON.stringify(scene(id, kind), null, 2))
for (const [id, , , rel, bg, line, glow] of textures) write(rel, svg(id, bg, line, glow))

const manifest = {
  schemaVersion: 'urai.spatial.asset-forge.v1',
  pipelineVersion: 'v1-procedural-source',
  status: 'generated-by-script',
  publicRoot: '/assets/urai/spatial',
  places: {
    'entry-chamber': { routes: ['/', '/spatial/ar-vr'], motion: 'default world, Ground below, Life Map above' },
    'ground-room': { routes: ['/ground'], motion: 'camera descent' },
    'life-map-sky': { routes: ['/life-map'], motion: 'camera ascent' },
    'focus-star': { routes: ['/focus'], motion: 'fly into selected star' },
    'replay-portal': { routes: ['/replay'], motion: 'memory film portal' },
    'passport-room': { routes: ['/passport'], motion: 'identity chamber' },
    'status-room': { routes: ['/status'], motion: 'control layer room' },
  },
  assets: [
    ...modelAssets.map(([id, place, route, rel, generator]) => ({ id, place, route, kind: 'model', file: `/assets/urai/spatial/${rel}`, generator, status: 'procedural-source' })),
    ...textures.map(([id, place, route, rel]) => ({ id, place, route, kind: rel.includes('particles') ? 'particle-svg' : 'texture-svg', file: `/assets/urai/spatial/${rel}`, generator: 'svg', status: 'procedural-source' })),
  ],
}
write('asset-forge-manifest.json', JSON.stringify(manifest, null, 2))

console.log(JSON.stringify({ ok: true, generatedModels: modelAssets.length, generatedTextures: textures.length, outRoot: path.relative(root, outRoot) }, null, 2))

function write(rel, content) {
  const file = path.join(outRoot, rel)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, content)
}

function scene(id, kind) {
  const colors = { metal: [0.02,0.025,0.05,1], glass: [0.1,0.55,1,0.55], gold: [1,0.62,0.18,1], violet: [0.55,0.22,1,0.65] }
  const materials = Object.entries(colors).map(([name, color]) => ({ name: `urai-${name}`, pbrMetallicRoughness: { baseColorFactor: color, metallicFactor: name === 'glass' ? .2 : .75, roughnessFactor: .18 }, emissiveFactor: [color[0]*.35,color[1]*.35,color[2]*.55], alphaMode: color[3] < 1 ? 'BLEND' : 'OPAQUE', doubleSided: true }))
  const meshes = build(kind).map((m, index) => ({ name: `${id}-${m.name}`, primitives: [{ attributes: { POSITION: 0 }, indices: 1, material: m.material ?? index % materials.length }] }))
  const nodes = meshes.map((mesh, meshIndex) => ({ name: mesh.name, mesh: meshIndex, translation: build(kind)[meshIndex]?.translation ?? [0,0,0], scale: build(kind)[meshIndex]?.scale ?? [1,1,1] }))
  const positions = new Float32Array([-1,0,-1,1,0,-1,1,0,1,-1,0,1,0,1.4,0])
  const indices = new Uint16Array([0,1,4,1,2,4,2,3,4,3,0,4,0,3,2,0,2,1])
  const bin = Buffer.concat([Buffer.from(positions.buffer), Buffer.from(indices.buffer)])
  return { asset: { version: '2.0', generator: 'URAI Spatial Asset Forge' }, scene: 0, scenes: [{ nodes: nodes.map((_, i) => i) }], nodes, meshes, materials, buffers: [{ byteLength: bin.length, uri: `data:application/octet-stream;base64,${bin.toString('base64')}` }], bufferViews: [{ buffer:0, byteOffset:0, byteLength:Buffer.from(positions.buffer).length }, { buffer:0, byteOffset:Buffer.from(positions.buffer).length, byteLength:Buffer.from(indices.buffer).length }], accessors: [{ bufferView:0, componentType:5126, count:5, type:'VEC3', min:[-1,0,-1], max:[1,1.4,1] }, { bufferView:1, componentType:5123, count:18, type:'SCALAR', min:[0], max:[4] }] }
}

function build(kind) {
  const base = [{ name:'core', material:1, scale:[1,1,1] }]
  if (kind === 'chamber') return [...base, { name:'floor-ring', material:2, scale:[5,.08,5] }, { name:'ceiling-ring', material:1, translation:[0,3.6,0], scale:[4.8,.08,4.8] }]
  if (kind === 'portal') return [{ name:'ring', material:1, scale:[2.2,2.2,.12] }, { name:'base', material:2, translation:[0,-1.2,0], scale:[2.6,.18,.6] }]
  if (kind === 'panel' || kind === 'board') return [{ name:'hologram-panel', material:1, translation:[0,1.1,0], scale:[2,1.35,.05] }, { name:'base', material:2, scale:[2.4,.18,.45] }]
  if (kind === 'station' || kind === 'plinth') return [{ name:'plinth', material:0, scale:[1.2,.42,1.2] }, { name:'orb', material:3, translation:[0,1.05,0], scale:[.55,.55,.55] }]
  if (kind === 'sky') return [{ name:'dome', material:1, scale:[7,3.5,7] }]
  if (kind === 'tunnel') return [{ name:'near-ring', material:1, scale:[3,3,.08] }, { name:'far-ring', material:3, translation:[0,0,-2.8], scale:[1.1,1.1,.08] }]
  if (kind === 'film') return [{ name:'portal', material:1, scale:[2.4,2.4,.12] }, { name:'film-left', material:2, translation:[-1.8,0,0], scale:[.18,2.8,.08] }, { name:'film-right', material:2, translation:[1.8,0,0], scale:[.18,2.8,.08] }]
  if (kind === 'hatch') return [{ name:'hatch-ring', material:2, scale:[2.2,.08,2.2] }, { name:'bridge', material:0, scale:[2.8,.08,.32] }]
  return base
}

function svg(id, bg, line, glow) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024" role="img" aria-label="${id}"><defs><radialGradient id="g" cx="50%" cy="50%" r="70%"><stop offset="0" stop-color="${glow}" stop-opacity=".9"/><stop offset=".45" stop-color="${line}" stop-opacity=".35"/><stop offset="1" stop-color="${bg}"/></radialGradient></defs><rect width="1024" height="1024" fill="url(#g)"/><g fill="none" stroke="${line}" stroke-opacity=".55">${Array.from({length:18},(_,i)=>`<circle cx="512" cy="512" r="${80+i*26}"/>`).join('')}</g><g stroke="${glow}" stroke-width="2" stroke-opacity=".65">${Array.from({length:32},(_,i)=>{const a=i*Math.PI/16;return `<path d="M512 512 L${512+Math.cos(a)*470} ${512+Math.sin(a)*470}"/>`}).join('')}</g></svg>`
}
