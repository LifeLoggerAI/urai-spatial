import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
const appFile=(path)=>fs.readFileSync(new URL('../src/app/'+path,import.meta.url),'utf8')
test('permanent movement proof prompt is absent',()=>{const s=appFile('HomeSpatialRuntimeLayer.tsx');assert.doesNotMatch(s,/function HomeMovementPrompt/);assert.doesNotMatch(s,/<HomeMovementPrompt \/>/)})
test('desktop does not mount mobile controls',()=>{const s=appFile('AssetDrivenHomeWorld.tsx');assert.match(s,/mobileControlsVisible/);assert.match(s,/coarsePointer.matches \|\| narrowViewport.matches/);assert.match(s,/mobileControlsVisible \? <MobileMovementPad/)})
test('canonical camera is corrected',()=>{const s=appFile('AssetDrivenHomeWorld.tsx');assert.match(s,/SPAWN = new THREE.Vector3\(0, 0, 8.0\)/);assert.match(s,/position: \[0, 1.82, 8.0\], fov: 48/)})
test('sanctuary depth hierarchy is source-owned',()=>{const s=appFile('HomeSanctuaryWorld.tsx');assert.match(s,/\[-6.8, -2.8, 1.2, 5.2\]/);assert.match(s,/color="#06131d"/);assert.match(s,/color="#0b3442"/);assert.match(s,/intensity=\{2.65\}/)})
test('Orb is the authored focal anchor',()=>{const s=appFile('AssetDrivenHomeWorld.tsx');assert.match(s,/scale=\{\[1.38 \* stateScale/);assert.match(s,/home-authored-orb/)})
