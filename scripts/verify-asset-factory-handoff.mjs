#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const publicRoot = path.join(root, 'urai-tier1', 'public');
const manifestPath = path.join(
  publicRoot,
  'assets',
  'urai',
  'final',
  'manifests',
  'asset-factory-spatial-handoff.json',
);

function sha256(filePath) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

const issues = [];
if (!fs.existsSync(manifestPath)) {
  issues.push(`missing handoff manifest: ${manifestPath}`);
} else {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (manifest.producer !== 'LifeLoggerAI/asset-factory') {
    issues.push(`unexpected producer: ${manifest.producer}`);
  }
  if (manifest.consumer !== 'LifeLoggerAI/urai-spatial') {
    issues.push(`unexpected consumer: ${manifest.consumer}`);
  }
  if (Number(manifest.missing || 0) !== 0) {
    issues.push(`handoff declares ${manifest.missing} missing asset(s)`);
  }

  const assets = Array.isArray(manifest.assets) ? manifest.assets : [];
  if (assets.length < 40) {
    issues.push(`handoff contains only ${assets.length} asset records; expected complete V1 wall`);
  }

  for (const asset of assets) {
    if (asset.status !== 'ready') {
      issues.push(`${asset.name}: status=${asset.status}`);
      continue;
    }
    const filePath = path.join(publicRoot, asset.canonicalPath);
    if (!fs.existsSync(filePath)) {
      issues.push(`${asset.name}: missing ${asset.canonicalPath}`);
      continue;
    }
    const actualHash = sha256(filePath);
    if (asset.sha256 && actualHash !== asset.sha256) {
      issues.push(`${asset.name}: sha256 mismatch`);
    }
    const bytes = fs.statSync(filePath).size;
    if (bytes < 20_000) {
      issues.push(`${asset.name}: suspiciously small promoted file (${bytes} bytes)`);
    }
    if (asset.renderer !== 'provider') {
      issues.push(`${asset.name}: production handoff renderer=${asset.renderer}`);
    }
  }
}

if (issues.length) {
  console.error('ASSET_FACTORY_HANDOFF_FAIL');
  for (const issue of issues) console.error(`- ${issue}`);
  process.exit(1);
}

console.log('ASSET_FACTORY_HANDOFF_PASS');
console.log(`MANIFEST=${manifestPath}`);
