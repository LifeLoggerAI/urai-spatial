import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root=process.cwd()
function read(relativePath){const absolutePath=path.join(root,relativePath);assert.ok(fs.existsSync(absolutePath),`missing expected file: ${relativePath}`);return fs.readFileSync(absolutePath,'utf8')}
const tierOne=read('src/spatial/layout/TierOneExperience.tsx')
const cohesion=read('src/spatial/layout/HomeCohesionLayer.tsx').replace(/\s+/g,' ')

test('legacy tier shell delegates Home to the production owner and keeps cohesion disabled off-route',()=>{
  assert.match(tierOne,/import \{ HomeWorldProduction \} from "\.\/HomeWorldProduction"/)
  assert.match(tierOne,/if \(mode === "home"\) \{\s*return <HomeWorldProduction \/>;\s*\}/)
  assert.match(tierOne,/import \{ HomeCohesionLayer \} from "\.\/HomeCohesionLayer"/)
  assert.match(tierOne,/mode === "ascent" \|\| mode === "unwind"/)
  assert.match(tierOne,/<HomeCohesionLayer enabled=\{false\} \/>/)
  assert.doesNotMatch(tierOne,/<HomeCohesionLayer enabled=\{mode === "home"\} \/>/)
})

test('home cohesion layer exposes stable spatial selectors',()=>{
  for(const token of ['urai-home-scene','urai-home-sky-portal','urai-orb-companion','urai-avatar-body','urai-ground-plane']) assert.match(cohesion,new RegExp(`data-testid="${token}"`))
})

test('home cohesion layer preserves passive portal semantics without dashboard chrome',()=>{
  assert.match(cohesion,/type HomePortal = "none" \| "orb" \| "avatar" \| "sky" \| "ground"/)
  assert.match(cohesion,/useState<HomePortal>\("orb"\)/)
  for(const token of ['data-urai-home-target="sky"','data-urai-home-target="orb"','data-urai-avatar-region="head"','data-urai-avatar-region="heart"','data-urai-avatar-region="arms"','data-urai-avatar-region="legs"']) assert.match(cohesion,new RegExp(token))
  for(const token of ['className="home-targets"','className="home-portal-card"','className="home-passive-orb"','Press O for Orb, A for Avatar','Passive companion is awake\\.']) assert.doesNotMatch(cohesion,new RegExp(token))
})

test('home cohesion layer preserves keyboard shortcuts and sky ascent accessibly',()=>{
  assert.match(cohesion,/Keyboard shortcuts: O focuses the orb, A focuses the avatar, S opens the sky ascent, G focuses the ground, and Escape settles the portal state\./)
  for(const token of ['if \\(key === "o"\\) setPortal\\("orb"\\)','if \\(key === "a"\\) setPortal\\("avatar"\\)','if \\(key === "g"\\) setPortal\\("ground"\\)','if \\(key === "s"\\) openSky\\(\\)','router\\.push\\("\\/ascent", \\{ scroll: false \\}\\)','router\\.push\\("\\/life-map\\?transition=sky", \\{ scroll: false \\}\\)','window\\.sessionStorage\\.setItem\\(SKY_PORTAL_KEY, "1"\\)','className="home-sky-hit-zone"','event\\.key === "Enter" \\|\\| event\\.key === " "']) assert.match(cohesion,new RegExp(token))
})

test('home cohesion layer includes avatar and ground sub-portals',()=>{
  for(const token of ['head:','heart:','arms:','legs:','room:','object:','routine:','place:','setAvatarRegion\\("head"\\)','setAvatarRegion\\("heart"\\)','setAvatarRegion\\("arms"\\)','setAvatarRegion\\("legs"\\)','data-urai-ground-anchor=\\{anchor\\}']) assert.match(cohesion,new RegExp(token))
})

test('home cohesion visual shell includes cinematic field and reduced-motion support',()=>{
  for(const token of ['home-cinematic-field','horizon-line','ground-curve','ground-aura','aura-column','center-orb','orb-upward-reflection','sky-portal-bloom','avatar-presence','@media \\(prefers-reduced-motion: reduce\\)','@media \\(max-width: 760px\\)']) assert.match(cohesion,new RegExp(token))
})
