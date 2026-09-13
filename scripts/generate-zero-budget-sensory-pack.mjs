import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const presentation = path.join(root, 'operations', 'presentation');
const spec = JSON.parse(fs.readFileSync(path.join(presentation, 'sensory-cue-pack.json'), 'utf8'));
const out = path.join(presentation, 'generated-zero-budget-sensory-pack');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const sampleRate = 24000;
function hash(text) { return crypto.createHash('sha256').update(text).digest('hex'); }
function writeAscii(view, offset, value) { for (let i=0;i<value.length;i+=1) view.setUint8(offset+i,value.charCodeAt(i)); }
function renderTone(id, durationMs, index) {
  const duration = Math.max(0.18, durationMs / 1000);
  const samples = Math.floor(sampleRate * duration);
  const bytes = samples * 2;
  const buffer = Buffer.alloc(44 + bytes);
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  writeAscii(view,0,'RIFF'); view.setUint32(4,36+bytes,true); writeAscii(view,8,'WAVE'); writeAscii(view,12,'fmt ');
  view.setUint32(16,16,true); view.setUint16(20,1,true); view.setUint16(22,1,true); view.setUint32(24,sampleRate,true);
  view.setUint32(28,sampleRate*2,true); view.setUint16(32,2,true); view.setUint16(34,16,true); writeAscii(view,36,'data'); view.setUint32(40,bytes,true);
  const seed = parseInt(hash(id).slice(0,8),16);
  const base = 160 + (seed % 420) + index * 7;
  for (let i=0;i<samples;i+=1) {
    const t = i / sampleRate;
    const a = Math.min(1, t/0.035, (duration-t)/0.08);
    const mod = 1 + 0.004*Math.sin(2*Math.PI*3*t);
    const s = (Math.sin(2*Math.PI*base*mod*t) * 0.24 + Math.sin(2*Math.PI*(base*1.5)*t) * 0.08) * Math.max(0,a);
    view.setInt16(44+i*2, Math.max(-1,Math.min(1,s))*32767, true);
  }
  return buffer;
}

const manifest = {schemaVersion:'1.0.0',providerCalls:0,spendUsd:'0.00',sampleRate,files:[],haptics:spec.haptics};
let index=0;
for (const family of spec.families) {
  const dir = path.join(out, family.id); fs.mkdirSync(dir,{recursive:true});
  for (const cue of family.cues) {
    const wav = renderTone(cue.id, cue.durationMs, index++);
    const rel = `${family.id}/${cue.id}.wav`; fs.writeFileSync(path.join(out,rel),wav);
    manifest.files.push({family:family.id,id:cue.id,path:rel,bytes:wav.length,sha256:hash(wav),proofOnly:true});
  }
}
fs.writeFileSync(path.join(out,'haptics.json'), JSON.stringify({schemaVersion:'1.0.0',patterns:spec.haptics},null,2)+'\n');
fs.writeFileSync(path.join(out,'manifest.json'), JSON.stringify(manifest,null,2)+'\n');
console.log(`Generated ${manifest.files.length} deterministic WAV proof cues and ${spec.haptics.length} haptic patterns; provider calls=0; spend=$0.00`);
