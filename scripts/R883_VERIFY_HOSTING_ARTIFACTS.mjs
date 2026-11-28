#!/usr/bin/env node
// One UrAi Genesis R883: review-only, offline Hosting artifact custody gate.
// This script performs local file reads and hashing only. It never makes network requests.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs'
import { resolve, join, posix } from 'node:path'
import { pathToFileURL } from 'node:url'

const SHA40 = /^[0-9a-f]{40}$/
const SHA256 = /^[0-9a-f]{64}$/
const RUN_ID = /^[1-9][0-9]*$/
const fingerprintName = 'release-fingerprint.json'
const mandatory = ['index.html', 'login/index.html', 'privacy-policy/index.html', 'support/index.html', fingerprintName]
const hash = bytes => createHash('sha256').update(bytes).digest('hex')

function requirePlainFile(file) {
  const stat = lstatSync(file)
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Not a regular file: ${file}`)
  return readFileSync(file)
}
function requirePlainDirectory(file) {
  const stat = lstatSync(file)
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error(`Not a regular directory: ${file}`)
}
function parseObject(file) {
  const parsed = JSON.parse(requirePlainFile(file).toString('utf8'))
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error(`Expected JSON object: ${file}`)
  return parsed
}
function inventory(root, prefix = '') {
  requirePlainDirectory(root)
  const out = []
  for (const entry of readdirSync(root, {withFileTypes:true}).sort((a,b) => a.name.localeCompare(b.name))) {
    const name = posix.join(prefix, entry.name)
    if (name.split('/').some(part => part.startsWith('.'))) throw new Error(`Firebase-ignored dot path: ${name}`)
    const abs = join(root, entry.name)
    const st = lstatSync(abs)
    if (st.isSymbolicLink()) throw new Error(`Symlink in publishable output: ${name}`)
    if (st.isDirectory()) out.push(...inventory(abs, name))
    else if (st.isFile()) {
      const bytes = readFileSync(abs)
      out.push({path:name, bytes:bytes.length, sha256:hash(bytes)})
    } else throw new Error(`Nonregular output: ${name}`)
  }
  return out.sort((a,b)=>a.path.localeCompare(b.path))
}
function verifyList(list, label) {
  if (!Array.isArray(list) || !list.length) throw new Error(`${label} must be a nonempty array`)
  const seen = new Set()
  for (const row of list) {
    if (!row || typeof row.path !== 'string' || !row.path || row.path.startsWith('/') ||
        row.path.split('/').some(p=>!p || p==='.' || p==='..' || p.startsWith('.')) ||
        posix.normalize(row.path) !== row.path) throw new Error(`${label} has unsafe path`)
    if (seen.has(row.path)) throw new Error(`${label} has duplicate path ${row.path}`)
    seen.add(row.path)
    if (!Number.isSafeInteger(row.bytes) || row.bytes < 0 || !SHA256.test(row.sha256)) throw new Error(`${label} has invalid file size or SHA-256`)
  }
  if (JSON.stringify([...seen].sort((a,b)=>a.localeCompare(b))) !== JSON.stringify(list.map(x=>x.path))) {
    throw new Error(`${label} is not sorted by path`)
  }
  for (const path of mandatory) if (!seen.has(path)) throw new Error(`${label} missing mandatory ${path}`)
}
function requireSameInventory(actual, expected, label) {
  verifyList(expected, label)
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${label} does not match actual output bytes`)
}
function totalsValid(doc, files) {
  if (doc.fileCount !== files.length || doc.totalBytes !== files.reduce((n,x)=>n+x.bytes,0)) {
    throw new Error('Manifest file count or total bytes mismatch')
  }
}
function verifyBaseManifest(m, expectedSha, runId) {
  const fixed = {
    schemaVersion:'urai-static-release-bundle-1', repository:'LifeLoggerAI/urai-spatial',
    authoritySha:expectedSha, targetSha:expectedSha, firebaseProject:'urai-4dc1d',
    liveUrl:'https://urai.app', deploymentScope:'functions-and-hosting', workflowRunId:runId,
  }
  for (const [name,value] of Object.entries(fixed)) if (String(m[name]) !== value) throw new Error(`Initial manifest ${name} mismatch`)
  if (!SHA40.test(String(m.rollbackSha || '')) || m.rollbackSha === expectedSha ||
      !SHA40.test(String(m.functionsTreeSha || '')) || !SHA256.test(String(m.firebaseStaticConfigSha256 || '')) ||
      !SHA256.test(String(m.fingerprintSha256 || ''))) throw new Error('Initial manifest hash or rollback validation failed')
  verifyList(m.files, 'Initial manifest')
  totalsValid(m, m.files)
}
function verifyFingerprint(fp, m, expectedSha, runId, phase) {
  const fixed = {
    schemaVersion:'urai-release-fingerprint-1', repository:'LifeLoggerAI/urai-spatial',
    releaseSha:expectedSha, authoritySha:expectedSha, rollbackSha:m.rollbackSha,
    firebaseProject:'urai-4dc1d', liveUrl:'https://urai.app',
    deploymentScope:'functions-and-hosting', functionsTreeSha:m.functionsTreeSha,
    firebaseStaticConfigSha256:m.firebaseStaticConfigSha256, workflowRunId:runId,
    certification:phase === 'pending'?'pending-post-deploy-smoke':'verified-post-deploy-smoke',
  }
  for (const [name,value] of Object.entries(fixed)) if (String(fp[name]) !== value) throw new Error(`Fingerprint ${name} mismatch`)
  if (phase === 'certified' && String(fp.certificationRunId) !== runId) throw new Error('Fingerprint certified run identity mismatch')
}

export function verifyHostingArtifactCustody({phase, outputRoot, preservedRoot, initialManifestPath, certifiedManifestPath, expectedSha, runId}) {
  if (!['pending','certified'].includes(phase)) throw new Error('phase must be pending or certified')
  if (!SHA40.test(String(expectedSha || ''))) throw new Error('expectedSha must be a full lowercase SHA')
  if (!RUN_ID.test(String(runId || ''))) throw new Error('runId must be positive decimal digits')
  for (const arg of [outputRoot,preservedRoot,initialManifestPath]) if (typeof arg !== 'string' || !arg.trim()) throw new Error('Missing required artifact path')
  const initialBytes = requirePlainFile(initialManifestPath)
  const m = JSON.parse(initialBytes.toString('utf8'))
  verifyBaseManifest(m, expectedSha, runId)
  const preserved = inventory(preservedRoot)
  const output = inventory(outputRoot)
  requireSameInventory(preserved, m.files, 'Initial preserved bundle')
  const initialFingerprintBytes = requirePlainFile(join(preservedRoot,fingerprintName))
  if (hash(initialFingerprintBytes) !== m.fingerprintSha256) throw new Error('Initial fingerprint digest mismatch')
  verifyFingerprint(JSON.parse(initialFingerprintBytes.toString('utf8')), m, expectedSha, runId, 'pending')
  if (phase === 'pending') {
    requireSameInventory(output, m.files, 'Pending publish output')
    verifyFingerprint(parseObject(join(outputRoot,fingerprintName)), m, expectedSha, runId, 'pending')
  } else {
    if (!certifiedManifestPath || !existsSync(certifiedManifestPath)) throw new Error('Certified manifest is required')
    const cert = parseObject(certifiedManifestPath)
    for (const [name,value] of Object.entries({
      schemaVersion:m.schemaVersion, repository:m.repository, authoritySha:m.authoritySha,
      targetSha:m.targetSha, rollbackSha:m.rollbackSha, firebaseProject:m.firebaseProject,
      liveUrl:m.liveUrl, deploymentScope:m.deploymentScope, workflowRunId:m.workflowRunId,
      functionsTreeSha:m.functionsTreeSha, firebaseStaticConfigSha256:m.firebaseStaticConfigSha256,
      certification:'verified-post-deploy-smoke', certificationRunId:runId,
      initialManifestSha256:hash(initialBytes), initialFingerprintSha256:hash(initialFingerprintBytes),
    })) {
      if (String(cert[name]) !== String(value)) throw new Error(`Certified manifest ${name} mismatch`)
    }
    const finalFPBytes = requirePlainFile(join(outputRoot, fingerprintName))
    if (cert.fingerprintSha256 !== hash(finalFPBytes)) throw new Error('Certified fingerprint digest mismatch')
    verifyFingerprint(JSON.parse(finalFPBytes.toString('utf8')), m, expectedSha, runId, 'certified')
    requireSameInventory(output, cert.files, 'Certified publish output')
    totalsValid(cert, cert.files)
    const unchanged = xs=>xs.filter(x=>x.path !== fingerprintName)
    if (JSON.stringify(unchanged(output)) !== JSON.stringify(unchanged(preserved))) throw new Error('Certified output changed non-fingerprint files')
    if (cert.bundleDigestSha256 !== hash(JSON.stringify(output))) throw new Error('Certified inventory digest mismatch')
  }
  return {schemaVersion:'urai-r883-artifact-custody-receipt-1',phase,releaseSha:expectedSha,workflowRunId:String(runId),fileCount:output.length,totalBytes:output.reduce((n,x)=>n+x.bytes,0),outputDigestSha256:hash(JSON.stringify(output)),fingerprintSha256:output.find(x=>x.path===fingerprintName).sha256,providerReadback:false,productionCertified:false,pass:true}
}

function parseArgs(args) {
  const options={}
  for (let i=0;i<args.length;i+=2) {
    const k=args[i], v=args[i+1]
    if (!k?.startsWith('--')||v === undefined) throw new Error('Use --key value arguments')
    const key=k.slice(2)
    if (options[key] !== undefined) throw new Error(`Duplicate argument ${key}`)
    options[key]=v
  }
  const allowed=new Set(['phase','output','preserved','initial-manifest','certified-manifest','release-sha','run-id'])
  for(const key of Object.keys(options)) if(!allowed.has(key)) throw new Error(`Unknown argument ${key}`)
  return options
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const a=parseArgs(process.argv.slice(2))
    const report=verifyHostingArtifactCustody({phase:a.phase, outputRoot:a.output, preservedRoot:a.preserved, initialManifestPath:a['initial-manifest'], certifiedManifestPath:a['certified-manifest'], expectedSha:a['release-sha'], runId:a['run-id']})
    process.stdout.write(JSON.stringify(report,null,2)+'\n')
  }catch(e){process.stderr.write(`R883 HOLD - artifact custody refused: ${e instanceof Error?e.message:String(e)}\n`);process.exitCode=1}
}
