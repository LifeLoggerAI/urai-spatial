import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const presentation = path.join(root, 'operations', 'presentation');
const out = path.join(presentation, 'generated-zero-budget-pack');
const registry = JSON.parse(fs.readFileSync(path.join(presentation, 'zero-budget-parallel-pack-2026-08-14.json'), 'utf8'));
const presets = JSON.parse(fs.readFileSync(path.join(presentation, 'surface-presets.json'), 'utf8'));
const copy = JSON.parse(fs.readFileSync(path.join(presentation, 'pack-copy.json'), 'utf8'));

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

function esc(value) {
  return String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
}
function hash(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
function svgFor(system, preset) {
  const title = copy.systemCopy?.[system.label]?.title ?? system.label;
  const subtitle = copy.systemCopy?.[system.label]?.subtitle ?? 'URAI system surface';
  const w = preset.width; const h = preset.height;
  const font = Math.max(28, Math.round(w * 0.045));
  const sub = Math.max(18, Math.round(w * 0.022));
  const pad = Math.max(40, Math.round(w * 0.06));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(system.label)} ${esc(preset.id)} template">
  <defs><radialGradient id="bg" cx="72%" cy="22%"><stop offset="0" stop-color="#16283a"/><stop offset="1" stop-color="#071018"/></radialGradient></defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <circle cx="${Math.round(w*0.76)}" cy="${Math.round(h*0.30)}" r="${Math.round(Math.min(w,h)*0.16)}" fill="none" stroke="#9EE7FF" stroke-width="3" opacity=".7"/>
  <circle cx="${Math.round(w*0.76)}" cy="${Math.round(h*0.30)}" r="${Math.round(Math.min(w,h)*0.07)}" fill="#9EE7FF" opacity=".16"/>
  <text x="${pad}" y="${Math.round(h*0.67)}" fill="#F7FAFC" font-size="${font}" font-family="system-ui,sans-serif" font-weight="650">${esc(title)}</text>
  <text x="${pad}" y="${Math.round(h*0.67)+Math.round(sub*1.65)}" fill="#D9E7F2" font-size="${sub}" font-family="system-ui,sans-serif">${esc(subtitle)}</text>
  <text x="${pad}" y="${h-pad}" fill="#9EE7FF" font-size="${Math.max(14,Math.round(sub*.7))}" font-family="ui-monospace,monospace">TEMPLATE · $0 · replace product slot with exact-SHA capture before product claims</text>
</svg>`;
}

const manifest = { schemaVersion:'1.0.0', generatedAt:new Date().toISOString(), providerCalls:0, spendUsd:'0.00', files:[] };
for (const system of registry.systems) {
  const systemDir = path.join(out, system.id);
  fs.mkdirSync(systemDir, { recursive: true });
  for (const preset of presets.presets) {
    const svg = svgFor(system, preset);
    const file = `${preset.id}.svg`;
    fs.writeFileSync(path.join(systemDir, file), svg);
    manifest.files.push({ system:system.id, preset:preset.id, path:`${system.id}/${file}`, sha256:hash(svg), finalCaptureRequired:preset.captureSlot.includes('product') });
  }
}
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`Generated ${manifest.files.length} deterministic presentation templates with provider calls=0 and spend=$0.00`);
