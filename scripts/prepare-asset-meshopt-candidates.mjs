#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { deriveAssetMeshoptCandidate, assetSha256 } from './lib/asset-meshopt-candidate.mjs'

const root = process.cwd()
const option = name => { const index = process.argv.indexOf(`--${name}`); return index < 0 ? '' : String(process.argv[index + 1] ?? '') }
const output = option('out-dir')
if (!output) throw new Error('--out-dir must select a fresh nonpublic candidate directory')
const outDir = path.resolve(output), publicRoot = path.resolve(root, 'urai-tier1/public')
if (outDir === publicRoot || outDir.startsWith(`${publicRoot}${path.sep}`) || fs.existsSync(outDir)) throw new Error('Candidate output must be fresh and outside the public runtime root')
let ancestor = path.dirname(outDir)
while (!fs.existsSync(ancestor)) ancestor = path.dirname(ancestor)
const resolvedOutput = path.join(fs.realpathSync(ancestor), path.relative(ancestor, outDir))
const resolvedPublic = fs.realpathSync(publicRoot)
if (resolvedOutput === resolvedPublic || resolvedOutput.startsWith(`${resolvedPublic}${path.sep}`)) throw new Error('Candidate output symlink resolves inside the public runtime root')
const manifestBytes = fs.readFileSync(path.join(root, 'operations/assets/launch-critical-assets.json'))
const manifest = JSON.parse(manifestBytes)
if (!Array.isArray(manifest.assets) || manifest.releasePolicy?.candidateAssetsMayShip !== false) throw new Error('Existing candidate-not-shipping authority is required')
const filter = option('asset-id')
const assets = manifest.assets.filter(asset => asset.kind === 'model' && asset.id !== 'home-entry-chamber-v1' && (!filter || asset.id === filter))
if (!assets.length) throw new Error('No registered uncompressed model selected')
fs.mkdirSync(outDir, { recursive: true })
const git = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' })
const records = []
for (const asset of assets) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(asset.id)) throw new Error('Unsafe registered asset identifier')
  const sourcePath = path.resolve(root, asset.fixedPath)
  if (!sourcePath.startsWith(`${publicRoot}${path.sep}`) || !fs.lstatSync(sourcePath).isFile()) throw new Error(`Registered source is not a regular public-root file: ${asset.id}`)
  if (!fs.realpathSync(sourcePath).startsWith(`${resolvedPublic}${path.sep}`)) throw new Error(`Registered source escapes public root: ${asset.id}`)
  const source = fs.readFileSync(sourcePath)
  const receipt = JSON.parse(fs.readFileSync(path.join(root, manifest.receiptRoot, `${asset.id}.json`)))
  if (receipt.sha256 !== assetSha256(source) || receipt.bytes !== source.length || asset.releaseState !== 'pending-final-review' || receipt.releaseState !== 'candidate-not-production-ready' || !asset.license || !asset.source) throw new Error(`Current source/receipt/admission binding rejected: ${asset.id}`)
  const { candidate, proof } = await deriveAssetMeshoptCandidate(source)
  if (!fs.readFileSync(sourcePath).equals(source)) throw new Error(`Immutable source changed: ${asset.id}`)
  const candidateFile = `${asset.id}.meshopt-candidate.glb`
  fs.writeFileSync(path.join(outDir, candidateFile), candidate, { flag: 'wx' })
  const record = { assetId: asset.id, canonicalSourcePath: asset.fixedPath, candidateFile, sourceLicense: asset.license, sourceAuthority: asset.source, sourceReleaseState: asset.releaseState, compression: 'lossless meshoptimizer 1.0; no quantization/filter/reordering', savedBytes: source.length - candidate.length, ...proof }
  fs.writeFileSync(path.join(outDir, `${asset.id}.receipt.json`), JSON.stringify(record, null, 2) + '\n', { flag: 'wx' })
  records.push(record)
}
const report = { schema: 'urai.asset-meshopt-review-candidates.v1', sourceHead: git.status === 0 ? git.stdout.trim() : null, sourceManifestSha256: assetSha256(manifestBytes), generatedAt: new Date().toISOString(), candidateAssetsMayShip: false, originalAssetsReplaced: false, providerCalls: 0, productionPromotion: false, assetCount: records.length, sourceBytes: records.reduce((sum, item) => sum + item.source.bytes, 0), candidateBytes: records.reduce((sum, item) => sum + item.candidate.bytes, 0), assets: records }
fs.writeFileSync(path.join(outDir, 'candidate-manifest.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' })
console.log(JSON.stringify({ assetCount: report.assetCount, sourceBytes: report.sourceBytes, candidateBytes: report.candidateBytes, candidateAssetsMayShip: false, outDir }, null, 2))
