import assert from 'node:assert/strict';
import fs from 'node:fs';

const registry=JSON.parse(fs.readFileSync(new URL('../../docs/contracts/ewi/integration-registry.seed.json', import.meta.url), 'utf8'));
const boundary=fs.readFileSync(new URL('../src/lib/spatial-launch-boundaries.ts', import.meta.url), 'utf8');
const ids=new Set(registry.integrations.map((x)=>x.integrationId));

for(const id of [
  'capture.camera-depth',
  'capture.lidar-room',
  'capture.photogrammetry-vio',
  'sensor.motion-orientation',
  'positioning.proximity',
  'environment.acoustic-spatial',
]){
  assert.ok(ids.has(id), `missing EWI sensor/capture integration: ${id}`);
  const entry=registry.integrations.find((x)=>x.integrationId===id);
  assert.ok(['planned','gated'].includes(entry.availability), `${id} must remain planned/gated`);
}

for(const token of [
  'live-camera-depth-capture',
  'live-lidar-room-scan',
  'live-photogrammetry-vio-reconstruction',
  'live-motion-orientation-sensors',
  'live-ble-uwb-wifi-positioning',
  'live-acoustic-spatial-sensing',
]){
  assert.ok(boundary.includes(token), `launch boundary missing ${token}`);
}

console.log('EWI environment capture and sensor modality contract passed');
