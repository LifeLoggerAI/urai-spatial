import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
const capture=fs.readFileSync(new URL('../../scripts/capture-reference-estate.mjs',import.meta.url),'utf8')
const home=fs.readFileSync(new URL('../src/spatial/layout/HomeAAAVisualRepair.tsx',import.meta.url),'utf8')
const platform=fs.readFileSync(new URL('../src/scene/RitualPlatform.tsx',import.meta.url),'utf8')
test('reference estate captures authored Ritual states and leaves undefined families blocked',()=>{for(let index=1;index<=12;index+=1){const id=`RITUAL-${String(index).padStart(3,'0')}`;assert.ok(capture.includes(`id:'${id}'`),`missing ${id}`)}assert.ok(!capture.includes("id:'RITUAL-013'"));assert.ok(!capture.includes("id:'RITUAL-014'"))})
test('Ritual review fixtures remain synthetic and accessible',()=>{assert.match(home,/disclosed-synthetic-no-personal-data/);assert.match(home,/no personal memory or supernatural certainty/);assert.match(platform,/reducedStimulation/);assert.match(platform,/stimulationScale/);assert.match(platform,/reducedStimulation \? 'off'/)})
