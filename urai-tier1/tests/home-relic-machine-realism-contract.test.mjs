import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import test from 'node:test'
const s=readFileSync(new URL('../src/spatial/layout/HomeWorldProductionFinal.tsx',import.meta.url),'utf8')
const a=s.slice(s.indexOf('function ContinuousVaultSkin'),s.indexOf('function SanctuaryGlazing'))
const m=s.slice(s.indexOf('function MachineCoreAssembly'),s.indexOf('function HumanPresence'))
test('V66 is a contiguous enclosed PBR reliquary',()=>{assert.match(s,/visualOwner:'enclosed-reliquary-v66'/);assert.match(a,/v66-contiguous-enclosed-stone-reliquary-no-open-sky-no-floating-geology/);assert.doesNotMatch(a,/ProductionAsset url=\{V48_ROCK_FACE/);assert.match(s,/root.visible = false/);assert.match(s,/v66-authored-chamber-retained-provenance-never-visible/)})
test('V66 replaces glass sphere with engineered fragments',()=>{assert.match(m,/v66-six-fragment-engineered-orb-no-glass-sphere-no-pedestal/);assert.match(m,/ORB_FRAGMENT_LAYOUT\.map/);assert.doesNotMatch(m,/sphereGeometry|torusGeometry|ProductionAsset url=\{V48_PIPE_SYSTEM\}/)})
test('V66 remains fail closed',()=>{assert.match(s,/data-home-visual-grade="cinematic-pbr-v66-enclosed-reliquary"/);assert.match(s,/data-home-final-art-revision="v66-enclosed-reliquary-candidate"/);assert.match(s,/data-home-art-certification="v66-retained-pixel-candidate-not-certified"/);assert.doesNotMatch(s,/PRODUCTION CERTIFIED|retained-pixel-pass|pixel-certified/)})
