#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const repoRoot = process.cwd();
const manifestPath = path.join(repoRoot, 'docs/assets/v1-critical-paid-assets.json');
const outDir = path.join(repoRoot, 'docs/assets/receipts');
const outJson = path.join(outDir, 'v1-critical-paid-assets-receipt.json');
const outMd = path.join(outDir, 'v1-critical-paid-assets-receipt.md');

function hashFile(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

const manifest = readJson(manifestPath);
const generatedAt = new Date().toISOString();
const assets = [];

for (const asset of manifest.assets) {
  const file = path.join(repoRoot, asset.path);
  const exists = fs.existsSync(file);
  const extension = path.extname(asset.path).slice(1).toLowerCase();
  let jsonValid = null;
  if (exists && asset.format === 'json') {
    try {
      readJson(file);
      jsonValid = true;
    } catch {
      jsonValid = false;
    }
  }
  assets.push({
    id: asset.id,
    priority: asset.priority,
    path: asset.path,
    format: asset.format,
    targetSurface: asset.targetSurface,
    exists,
    extensionMatches: extension === asset.format,
    sizeBytes: exists ? fs.statSync(file).size : 0,
    sha256: exists ? hashFile(file) : null,
    jsonValid
  });
}

const blocked = assets.filter((asset) => {
  if (!asset.exists) return true;
  if (!asset.extensionMatches) return true;
  if (asset.sizeBytes <= 0) return true;
  if (asset.jsonValid === false) return true;
  return false;
});

const summary = {
  generatedAt,
  totalAssets: assets.length,
  presentAssets: assets.filter((asset) => asset.exists).length,
  blockedAssets: blocked.length,
  locked: blocked.length === 0
};

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outJson, JSON.stringify({ summary, assets }, null, 2));

const lines = [
  '# V1 Critical Paid Assets Receipt',
  '',
  `Generated: ${generatedAt}`,
  '',
  '## Summary',
  '',
  `- Total assets: ${summary.totalAssets}`,
  `- Present assets: ${summary.presentAssets}`,
  `- Blocked assets: ${summary.blockedAssets}`,
  `- Locked: ${summary.locked ? 'yes' : 'no'}`,
  '',
  '## Assets',
  '',
  '| Asset | Present | Size | SHA-256 | Path |',
  '|---|---:|---:|---|---|'
];

for (const asset of assets) {
  lines.push(`| ${asset.id} | ${asset.exists ? 'yes' : 'no'} | ${asset.sizeBytes} | ${asset.sha256 ?? 'missing'} | \`${asset.path}\` |`);
}

lines.push('', '## Required validation after receipt', '', '```bash', 'pnpm --dir urai-tier1 assets:validate', 'pnpm --dir urai-tier1 typecheck', 'pnpm --dir urai-tier1 build', '```');
fs.writeFileSync(outMd, lines.join('\n'));

console.log(JSON.stringify(summary, null, 2));

if (blocked.length > 0) {
  console.error('Blocked V1 paid asset lock:');
  for (const asset of blocked) console.error(`- ${asset.id}: ${asset.path}`);
  process.exitCode = 1;
}
