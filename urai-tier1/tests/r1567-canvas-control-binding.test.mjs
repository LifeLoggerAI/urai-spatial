import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
const source=fs.readFileSync(new URL('../src/app/focus/FocusChamberClient.tsx',import.meta.url),'utf8')
test('OrbitControls uses actual WebGL canvas, not unknown event parent',()=>{
  assert.match(source,/function FocusScene\(/)
  assert.match(source,/const \{ gl \} = useThree\(\)/)
  assert.match(source,/<OrbitControls ref=\{controls\} domElement=\{gl\.domElement\}/)
})
test('touch action remains controlled by the camera canvas',()=>{
  assert.match(source,/\.focusCanvas canvas\{touch-action:none\}/)
  assert.match(source,/<OrbitControls [^>]*enableZoom/)
})
