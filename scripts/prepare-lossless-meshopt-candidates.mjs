#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { EXTENSION, prepareLosslessDerivative, readGlb, sha256 } from './lib/lossless-meshopt-glb.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const metadataPath = 'operations/assets/compression-candidates/lossless-meshopt-v1.json';
const generatedRoot = 'operations/assets/compression-candidates/generated';
const manifestPath = 'operations/assets/launch-critical-assets.json';
const sourceSha = process.argv[2];
if (!/^[a-f0-9]{40}$/.test(sourceSha ?? '') || process.argv.length !== 3) throw new Error('Usage: node scripts/prepare-lossless-meshopt-candidates.mjs <40-character original source commit>');
const git = (...args) => execFileSync('git', args, { cwd: root, maxBuffer: 64 * 1024 * 1024 });
const sourceCommit = git('rev-parse', `${sourceSha}^{commit}`).toString().trim();
assert.equal(sourceCommit, sourceSha);
const preparationSourceSha = git('rev-parse', 'HEAD').toString().trim();
const manifestBytes = fs.readFileSync(path.join(root, manifestPath));
assert.deepEqual(manifestBytes, git('show', `${sourceCommit}:${manifestPath}`), 'Manifest does not match declared source commit');
const manifest = JSON.parse(manifestBytes);
assert.equal(manifest.releasePolicy.candidateAssetsMayShip, false);

function withinRoot(relative) {
  if (typeof relative !== 'string' || path.isAbsolute(relative) || relative.split(/[\\/]/).includes('..')) throw new Error(`Unsafe path: ${relative}`);
  const absolute = path.resolve(root, relative);
  if (!absolute.startsWith(`${root}${path.sep}`)) throw new Error(`Path outside repository: ${relative}`);
  return absolute;
}

function filesUnder(relative) {
  const absolute = withinRoot(relative);
  if (!fs.existsSync(absolute)) throw new Error(`Protected directory is missing: ${relative}`);
  return fs.readdirSync(absolute, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap((entry) => {
    if (entry.isSymbolicLink()) throw new Error('Protected paths may not be symlinks');
    const next = `${relative}/${entry.name}`;
    return entry.isDirectory() ? filesUnder(next) : [next];
  });
}

const protectedPaths = [...new Set([manifestPath, ...manifest.assets.map((asset) => asset.fixedPath), ...filesUnder(manifest.receiptRoot)])].sort();
const snapshot = () => protectedPaths.map((relative) => ({ path: relative, sha256: sha256(fs.readFileSync(withinRoot(relative))) }));
const before = snapshot();
const sourceFiles = ['scripts/lib/lossless-meshopt-glb.mjs', 'scripts/prepare-lossless-meshopt-candidates.mjs', 'tests/lossless-meshopt-glb.test.mjs'];
for (const relative of sourceFiles) assert.deepEqual(fs.readFileSync(withinRoot(relative)), git('show', `${preparationSourceSha}:${relative}`), 'Commit preparation source before generating candidates');

function writeNewOrIdentical(relative, bytes) {
  const absolute = withinRoot(relative);
  if (!relative.startsWith('operations/assets/compression-candidates/')) throw new Error('Candidates must stay outside public/runtime');
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  if (fs.existsSync(absolute)) {
    assert.deepEqual(fs.readFileSync(absolute), bytes, `Refusing to replace a different candidate: ${relative}`);
  } else fs.writeFileSync(absolute, bytes, { flag: 'wx' });
}

const assets = [];
const skipped = [];
for (const asset of manifest.assets.filter((entry) => entry.kind === 'model')) {
  const original = fs.readFileSync(withinRoot(asset.fixedPath));
  assert.deepEqual(original, git('show', `${sourceCommit}:${asset.fixedPath}`), `${asset.id} does not match declared source commit`);
  const glb = readGlb(original);
  if (glb.json.extensionsUsed?.includes(EXTENSION)) {
    skipped.push({ id: asset.id, sourcePath: asset.fixedPath, originalSha256: sha256(original), reason: 'Already declares EXT_meshopt_compression; left untouched' });
    continue;
  }
  assert.equal(asset.releaseState, 'pending-final-review');
  const { candidate, proof } = await prepareLosslessDerivative(original);
  assert.ok(candidate.length < original.length, `${asset.id} did not become smaller`);
  const candidatePath = `${generatedRoot}/${asset.id}.lossless-meshopt.glb`;
  writeNewOrIdentical(candidatePath, candidate);
  assets.push({
    id: asset.id, sourcePath: asset.fixedPath, candidatePath,
    originalSha256: sha256(original), candidateSha256: sha256(candidate),
    originalBytes: original.length, candidateBytes: candidate.length,
    savedBytes: original.length - candidate.length,
    source: asset.source, license: asset.license, releaseState: asset.releaseState,
    promote: false, runtimeAdmitted: false, humanAccepted: false, visualAccepted: false,
    proof,
  });
  console.log(JSON.stringify({ id: asset.id, originalBytes: original.length, candidateBytes: candidate.length, compressedViews: proof.compressedViews, unchangedImages: proof.images.length }));
}
assert.equal(assets.length, 21, 'Expected exactly the 21 uncompressed launch model candidates');
assert.equal(skipped.length, 1, 'Expected already-compressed Home to remain unchanged');
assert.deepEqual(snapshot(), before, 'Original assets, canonical manifest, or golden receipt bytes changed');
const total = (key) => assets.reduce((sum, asset) => sum + asset[key], 0);
const receipt = {
  schemaVersion: 1, preparationId: 'urai-lossless-meshopt-v1',
  sourceCommit, preparationSourceSha, originalManifestPath: manifestPath, originalManifestSha256: sha256(manifestBytes),
  preparationSourceFixity: sourceFiles.map((relative) => ({ path: relative, sha256: sha256(fs.readFileSync(withinRoot(relative))) })),
  specification: 'https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Vendor/EXT_meshopt_compression/README.md',
  encoder: { package: 'meshoptimizer', version: JSON.parse(fs.readFileSync(path.join(root, 'node_modules/meshoptimizer/package.json'))).version, encodedVersion: 0, filters: ['NONE'], modes: ['ATTRIBUTES', 'INDICES'] },
  decoder: { package: 'three-stdlib', version: JSON.parse(fs.readFileSync(path.join(root, 'node_modules/three-stdlib/package.json'))).version, consumer: 'Drei useGLTF default MeshoptDecoder factory' },
  state: 'prepared-pending-review', promote: false, runtimeAdmitted: false, humanAccepted: false, visualAccepted: false,
  originalsUnchanged: true, canonicalManifestUnchanged: true, goldenReceiptsUnchanged: true,
  transforms: { quantization: false, simplification: false, geometryReordering: false, indexReordering: false, animationResampling: false, textureReencoding: false },
  pendingGates: ['Independent source/package review', 'Bound candidate full browser material/skin/animation/render QA', 'Owner/human visual acceptance', 'Existing asset admission/promotion review', 'Physical device and deployment certification'],
  limits: ['Byte-exact actual runtime decoder proof is not full browser texture upload or visual acceptance', 'No physical GPU performance measurement', 'No active runtime path or asset admission state changed'],
  totals: { preparedModels: assets.length, skippedAlreadyCompressed: skipped.length, originalBytes: total('originalBytes'), candidateBytes: total('candidateBytes'), savedBytes: total('savedBytes'), compressedViews: assets.reduce((sum, asset) => sum + asset.proof.compressedViews, 0), unchangedEmbeddedImages: assets.reduce((sum, asset) => sum + asset.proof.images.length, 0) },
  protectedSourceFixity: before, skipped, assets,
};
writeNewOrIdentical(metadataPath, Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`));
console.log(JSON.stringify({ metadataPath, ...receipt.totals, promote: false, runtimeAdmitted: false }));
