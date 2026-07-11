#!/usr/bin/env node
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const contractFile = path.join(root, 'operations/assets/contracts/asset-factory-v1-spatial-pack.json')
const registryFile = path.join(root, 'urai-tier1/src/spatial/assets/uraiAssets.ts')
const errors = []
const notes = []

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, value, index, all) => {
  if (value === '--contract-only') pairs.push(['contractOnly', true])
  else if (value.startsWith('--')) pairs.push([value.slice(2), all[index + 1]])
  return pairs
}, []))

const fail = (condition, message) => { if (!condition) errors.push(message) }
const json = (file, label) => {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')) }
  catch (error) { errors.push(`${label}: ${error.message}`); return null }
}
const hash = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
const sha = (value) => typeof value === 'string' && /^[0-9a-f]{64}$/i.test(value)
const commitSha = (value) => typeof value === 'string' && /^[0-9a-f]{40}$/i.test(value)
const positive = (value) => Number.isInteger(value) && value > 0
const money = (value) => Number(String(value))
const set = (values) => [...new Set([...values].map(String))].sort()
const same = (actual, expected, label) => fail(JSON.stringify(set(actual)) === JSON.stringify(set(expected)), `${label}: set mismatch`)

function safe(base, relative, label) {
  const basePath = path.resolve(base)
  const target = path.resolve(basePath, String(relative || ''))
  if (!(target === basePath || target.startsWith(`${basePath}${path.sep}`))) {
    errors.push(`${label}: path escapes root`)
    return path.join(basePath, '__invalid__')
  }
  return target
}

function regular(file, label) {
  try {
    const stat = fs.lstatSync(file)
    fail(stat.isFile() && !stat.isSymbolicLink(), `${label}: not a regular non-symlink file`)
    return stat
  } catch (error) {
    errors.push(`${label}: missing ${file}`)
    return null
  }
}

function rejectSymlinks(directory, label) {
  if (!fs.existsSync(directory)) return
  const stack = [directory]
  while (stack.length) {
    const current = stack.pop()
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const target = path.join(current, entry.name)
      const stat = fs.lstatSync(target)
      fail(!stat.isSymbolicLink(), `${label}: symbolic link forbidden: ${target}`)
      if (stat.isDirectory() && !stat.isSymbolicLink()) stack.push(target)
    }
  }
}

const contract = json(contractFile, 'contract')

function verifyContract() {
  fail(contract && typeof contract === 'object' && !Array.isArray(contract), 'contract must be an object')
  if (!contract) return
  fail(contract.schemaVersion === '1.0.0', 'contract schema mismatch')
  fail(contract.contractId === 'URAI-SPATIAL-ASSET-FACTORY-V1-INTAKE-20260711', 'contract id mismatch')
  fail(contract.producer === 'LifeLoggerAI/asset-factory' && contract.consumer === 'LifeLoggerAI/urai-spatial', 'contract repository identity mismatch')
  fail(contract.version === 'v1' && contract.expectedOutputs === 53, 'contract V1 output count mismatch')
  fail(contract.directProviderOutputs === 48 && contract.reusedProviderOutputs === 1 && contract.newProviderCalls === 47 && contract.derivedProviderOutputs === 5, 'contract provider counts mismatch')
  fail(money(contract.maxUnitCostUsd) === 1 && money(contract.maxTotalCostUsd) === 47, 'contract cost ceilings mismatch')
  fail(contract.assetPrefix === 'assets/urai/' && contract.copyRoot === 'urai-tier1/public', 'contract path authority mismatch')
  fail(contract.activationMode === 'atomic-complete-pack' && contract.promotion === false, 'contract must remain atomic and non-promoting')
  fail(commitSha(contract.authorizedMarkerSha), 'contract marker SHA malformed')
  fail(typeof contract.seedProviderRequestId === 'string' && contract.seedProviderRequestId.length > 8, 'contract seed request missing')

  const assets = Array.isArray(contract.assets) ? contract.assets : []
  fail(assets.length === 53, `contract expected 53 assets, found ${assets.length}`)
  fail(new Set(assets.map((asset) => asset.name)).size === 53, 'contract names are not unique')
  fail(new Set(assets.map((asset) => asset.canonicalPath)).size === 53, 'contract paths are not unique')
  for (const asset of assets) {
    fail(/^[a-z0-9_]+$/.test(String(asset.name)), `contract/${asset.name}: invalid name`)
    fail(String(asset.canonicalPath).startsWith('assets/urai/') && String(asset.canonicalPath).endsWith('.webp') && !String(asset.canonicalPath).split('/').some((part) => ['', '.', '..'].includes(part)), `contract/${asset.name}: unsafe path`)
    fail(['new-provider', 'reused-provider', 'derived-provider'].includes(asset.sourceMode), `contract/${asset.name}: invalid source mode`)
    fail(typeof asset.registryRequired === 'boolean', `contract/${asset.name}: registryRequired must be boolean`)
  }
  fail(assets.filter((asset) => asset.sourceMode === 'new-provider').length === 47, 'contract new-provider count mismatch')
  fail(assets.filter((asset) => asset.sourceMode === 'reused-provider').length === 1 && assets.find((asset) => asset.sourceMode === 'reused-provider')?.name === 'home_threshold_main', 'contract reused Home boundary mismatch')
  same(assets.filter((asset) => asset.sourceMode === 'derived-provider').map((asset) => asset.name), ['status_route_matrix_main', 'status_route_matrix_mobile', 'status_health_pill', 'open_graph_launch', 'open_graph_life_map'], 'contract derived names')
  fail(assets.filter((asset) => asset.registryRequired).length === 51, 'contract registry count mismatch')

  regular(registryFile, 'Spatial asset registry')
  if (fs.existsSync(registryFile)) {
    const registry = fs.readFileSync(registryFile, 'utf8')
    const registered = [...registry.matchAll(/\bwebp\(\s*["']([^"'\n]+)["']\s*\)/g)].map((match) => `assets/urai${match[1]}`)
    fail(new Set(registered).size === registered.length, 'Spatial registry has duplicate WebP paths')
    same(registered, assets.filter((asset) => asset.registryRequired).map((asset) => asset.canonicalPath), 'Spatial registry paths')
  }
  for (const [name, markers] of Object.entries(contract.spatialCanon || {})) {
    fail(assets.some((asset) => asset.name === name), `spatial canon references unknown asset ${name}`)
    fail(Array.isArray(markers) && markers.length > 0 && markers.every((marker) => typeof marker === 'string' && marker === marker.toLowerCase()), `spatial canon markers invalid for ${name}`)
  }
}

function verifyArtifacts(generationRoot, postRoot) {
  const layout = contract.artifactLayout
  rejectSymlinks(generationRoot, 'generation artifact')
  rejectSymlinks(postRoot, 'post-certification artifact')
  if (errors.length) return

  const files = Object.fromEntries(Object.entries(layout).map(([key, relative]) => [key, safe(key === 'postCertificationReport' ? postRoot : generationRoot, relative, key)]))
  for (const [key, file] of Object.entries(files)) if (key !== 'handoffRoot') regular(file, key)
  if (errors.length) return

  const manifest = json(files.generatedManifest, 'generated manifest')
  const forge = json(files.forgeReceipt, 'forge receipt')
  const quality = json(files.qualityReport, 'quality report')
  const dropin = json(files.dropinReceipt, 'drop-in receipt')
  const budget = json(files.budgetLedger, 'budget ledger')
  const handoff = json(files.versionedHandoffManifest, 'versioned handoff')
  const generic = json(files.genericHandoffManifest, 'generic handoff')
  const post = json(files.postCertificationReport, 'post-certification report')
  if (errors.length) return

  const assets = contract.assets
  const expectedNames = assets.map((asset) => asset.name)
  const expectedPaths = assets.map((asset) => asset.canonicalPath)
  const byName = new Map(assets.map((asset) => [asset.name, asset]))
  const directNames = assets.filter((asset) => asset.sourceMode !== 'derived-provider').map((asset) => asset.name)
  const newNames = assets.filter((asset) => asset.sourceMode === 'new-provider').map((asset) => asset.name)
  const manifestHash = hash(files.generatedManifest)

  fail(Array.isArray(manifest) && manifest.length === 53, 'generated manifest must contain 53 entries')
  same((manifest || []).map((entry) => entry.name), expectedNames, 'generated manifest names')
  const requestByName = new Map()
  const sourceByName = new Map()
  const derivedIds = []
  for (const entry of manifest || []) {
    const expected = byName.get(entry.name)
    if (!expected) continue
    fail(entry.status === 'generated' && entry.renderer === 'provider', `manifest/${entry.name}: not generated by provider`)
    const prompt = String(entry.prompt || '').toLowerCase()
    for (const marker of contract.spatialCanon[entry.name] || []) fail(prompt.includes(marker), `manifest/${entry.name}: missing canon marker ${marker}`)
    const sizes = Array.isArray(entry.sizes) ? entry.sizes.filter(positive) : []
    fail(sizes.length > 0 && typeof entry.path_template === 'string' && entry.path_template.includes('{size}'), `manifest/${entry.name}: invalid output path contract`)
    if (!sizes.length || typeof entry.path_template !== 'string') continue
    const source = safe(path.join(generationRoot, 'image_asset_generator'), entry.path_template.replaceAll('{size}', String(Math.max(...sizes))), `manifest/${entry.name}/source`)
    const metadataFile = `${source}.render.json`
    regular(source, `manifest/${entry.name}/source`)
    regular(metadataFile, `manifest/${entry.name}/metadata`)
    sourceByName.set(entry.name, source)
    const metadata = json(metadataFile, `manifest/${entry.name}/metadata`)
    const details = metadata?.metadata || {}
    fail(metadata?.renderer === 'provider', `manifest/${entry.name}: metadata renderer mismatch`)
    if (expected.sourceMode === 'derived-provider') {
      fail(details.provider === 'derived-provider' && Array.isArray(details.source_provider_request_ids) && details.source_provider_request_ids.length > 0, `manifest/${entry.name}: derived provenance missing`)
      fail(entry.derivation && Array.isArray(entry.derivation.sourceProviderRequestIds) && entry.derivation.sourceProviderRequestIds.length > 0, `manifest/${entry.name}: derivation receipt missing`)
      derivedIds.push(...(details.source_provider_request_ids || []))
    } else {
      fail(typeof details.provider_request_id === 'string' && details.provider_request_id.length > 8, `manifest/${entry.name}: provider request missing`)
      if (details.provider_request_id) requestByName.set(entry.name, details.provider_request_id)
    }
  }
  fail(requestByName.size === 48 && new Set(requestByName.values()).size === 48, 'direct provider request ids must be 48 unique values')
  fail(requestByName.get('home_threshold_main') === contract.seedProviderRequestId, 'Home seed request mismatch')
  for (const id of derivedIds) fail(new Set(requestByName.values()).has(id), `derived provenance references unknown provider request ${id}`)

  fail(forge?.schemaVersion === '2.0.0' && forge?.version === 'v1' && forge?.status === 'passed' && forge?.forgeExitCode === 0, 'forge receipt identity/status mismatch')
  fail(forge?.expectedOutputs === 53 && forge?.ready === 53 && forge?.generated === 53 && forge?.completed === 53 && forge?.missing === 0, 'forge receipt counts mismatch')
  fail(forge?.directProviderOutputs === 48 && forge?.reusedProviderOutputs === 1 && forge?.newProviderCalls === 47 && forge?.derivedProviderOutputs === 5, 'forge provider counts mismatch')
  fail(forge?.seedProviderRequestId === contract.seedProviderRequestId && forge?.manifestSha256 === manifestHash && forge?.promotion === false, 'forge provenance/promotion boundary mismatch')
  fail(money(forge?.reservedEstimatedCostUsd) <= 47, 'forge reserved exposure exceeds USD 47.00')

  fail(quality?.schemaVersion === '2.1.0' && quality?.status === 'passed' && quality?.failed === 0 && quality?.passed === 53, 'quality report not fully passed')
  fail(quality?.requireProvider === true && quality?.providerBacked === 53 && quality?.directProvider === 48 && quality?.derivedProvider === 5, 'quality provider counts mismatch')
  fail(Array.isArray(quality?.assets) && quality.assets.length === 53 && quality.assets.every((item) => item?.status === 'passed'), 'quality asset results incomplete')
  same((quality?.assets || []).map((item) => item.name), expectedNames, 'quality asset names')

  fail(dropin?.schemaVersion === '1.0.0' && dropin?.version === 'v1' && dropin?.status === 'certified', 'drop-in receipt not certified')
  fail(dropin?.expectedOutputs === 53 && dropin?.ready === 53 && dropin?.missing === 0 && dropin?.targetRepo === contract.consumer, 'drop-in receipt counts/target mismatch')
  fail(dropin?.manifestSha256 === manifestHash, 'drop-in manifest hash mismatch')

  fail(budget?.schemaVersion === '1.1.0' && typeof budget?.runId === 'string', 'budget ledger identity mismatch')
  fail(budget?.providerCallsExecuted === 47 && money(budget?.reservedEstimatedCostUsd) === 47 && Array.isArray(budget?.attempts) && budget.attempts.length === 47, 'budget ledger counts/exposure mismatch')
  const ledgerAssets = []
  const ledgerIds = []
  for (let index = 0; index < (budget?.attempts || []).length; index += 1) {
    const attempt = budget.attempts[index]
    const number = index + 1
    fail(attempt.attemptId === `${budget.runId}:${number}` && attempt.callNumber === number, `budget attempt ${number}: sequence mismatch`)
    fail(attempt.status === 'succeeded' && !attempt.error, `budget attempt ${number}: not successful`)
    fail(money(attempt.reservedUnitCostUsd) === 1 && money(attempt.reservedCumulativeCostUsd) === number, `budget attempt ${number}: cost mismatch`)
    fail(/^\d+x\d+$/.test(String(attempt.requestSize || '')), `budget attempt ${number}: size mismatch`)
    fail(typeof attempt.providerRequestId === 'string' && attempt.providerRequestId.length > 8, `budget attempt ${number}: request id missing`)
    ledgerAssets.push(attempt.asset)
    ledgerIds.push(attempt.providerRequestId)
  }
  same(ledgerAssets, newNames, 'budget asset names')
  same(ledgerIds, newNames.map((name) => requestByName.get(name)), 'budget provider request ids')
  fail(new Set(ledgerIds).size === 47, 'budget provider request ids are not unique')

  fail(handoff?.schemaVersion === '3.0.0' && handoff?.version === 'v1', 'handoff identity mismatch')
  fail(handoff?.producer === contract.producer && handoff?.consumer === contract.consumer, 'handoff repository identity mismatch')
  fail(handoff?.expectedOutputs === 53 && handoff?.ready === 53 && handoff?.missing === 0, 'handoff counts mismatch')
  fail(handoff?.assetPrefix === contract.assetPrefix && handoff?.copyRoot === contract.copyRoot && handoff?.providerRequired === true && handoff?.activationMode === 'atomic-complete-pack', 'handoff authority mismatch')
  fail(handoff?.sourceManifestSha256 === manifestHash, 'handoff source manifest hash mismatch')
  fail(hash(files.versionedHandoffManifest) === hash(files.genericHandoffManifest) && JSON.stringify(handoff) === JSON.stringify(generic), 'generic/versioned handoff mismatch')
  fail(Array.isArray(handoff?.assets) && handoff.assets.length === 53, 'handoff asset count mismatch')
  same((handoff?.assets || []).map((asset) => asset.name), expectedNames, 'handoff names')
  same((handoff?.assets || []).map((asset) => asset.canonicalPath), expectedPaths, 'handoff paths')
  const handoffByName = new Map((handoff?.assets || []).map((asset) => [asset.name, asset]))
  for (const expected of assets) {
    const asset = handoffByName.get(expected.name)
    if (!asset) continue
    fail(asset.status === 'ready' && asset.renderer === 'provider' && asset.canonicalPath === expected.canonicalPath, `handoff/${expected.name}: readiness mismatch`)
    fail(positive(asset.bytes) && positive(asset.width) && positive(asset.height) && typeof asset.alpha === 'boolean' && sha(asset.sha256), `handoff/${expected.name}: receipt malformed`)
    const file = safe(files.handoffRoot, expected.canonicalPath, `handoff/${expected.name}`)
    const stat = regular(file, `handoff/${expected.name}`)
    if (stat) fail(stat.size === asset.bytes && hash(file) === asset.sha256.toLowerCase(), `handoff/${expected.name}: bytes/hash mismatch`)
  }
  const webps = []
  const stack = [path.join(files.handoffRoot, 'assets', 'urai')]
  while (stack.length) {
    const current = stack.pop()
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const target = path.join(current, entry.name)
      if (entry.isDirectory()) stack.push(target)
      else if (entry.isFile() && target.endsWith('.webp')) webps.push(path.relative(files.handoffRoot, target).split(path.sep).join('/'))
    }
  }
  same(webps, expectedPaths, 'handoff WebP inventory')
  fail(dropin?.handoffManifestSha256 === hash(files.versionedHandoffManifest), 'drop-in handoff hash mismatch')

  fail(post?.schemaVersion === '1.0.0' && post?.status === 'passed' && post?.sourceHeadSha === contract.authorizedMarkerSha, 'post-certification identity/status mismatch')
  fail(positive(post?.sourceRunId) && positive(post?.sourceArtifactId) && post?.directProviderAssetsChecked === 48, 'post-certification run/count mismatch')
  fail(Array.isArray(post?.duplicatePairs) && post.duplicatePairs.length === 0, 'post-certification found near-duplicate pairs')
  fail(Array.isArray(post?.assets) && post.assets.length === 48, 'post-certification direct asset count mismatch')
  same((post?.assets || []).map((asset) => asset.name), directNames, 'post-certification direct names')
  const postIds = []
  for (const asset of post?.assets || []) {
    const source = sourceByName.get(asset.name)
    fail(asset.providerRequestId === requestByName.get(asset.name), `post-certification/${asset.name}: provider request mismatch`)
    fail(sha(asset.sha256) && /^[0-9a-f]{64}$/i.test(String(asset.perceptualHash || '')), `post-certification/${asset.name}: hash malformed`)
    if (source) fail(hash(source) === asset.sha256.toLowerCase(), `post-certification/${asset.name}: source hash mismatch`)
    postIds.push(asset.providerRequestId)
  }
  same(postIds, requestByName.values(), 'post-certification provider request ids')
  fail(new Set(postIds).size === 48, 'post-certification provider request ids are not unique')

  notes.push('Certified 53 V1 Spatial assets without copying or activating them.')
  notes.push('Verified 47 new provider calls, one proven Home seed, five provider-derived outputs, and zero duplicate pairs.')
}

verifyContract()
if (!args.contractOnly) {
  fail(typeof args['generation-root'] === 'string' && typeof args['post-certification-root'] === 'string', 'artifact mode requires --generation-root and --post-certification-root')
  if (!errors.length) verifyArtifacts(path.resolve(args['generation-root']), path.resolve(args['post-certification-root']))
} else {
  notes.push('Contract and current registry verified; no asset was copied or activated.')
}

const report = {
  schemaVersion: '1.0.0',
  contractId: contract?.contractId || null,
  mode: args.contractOnly ? 'contract-only' : 'artifact-intake',
  status: errors.length ? 'failed' : 'passed',
  promotion: false,
  errors,
  notes,
}
const output = `${JSON.stringify(report, null, 2)}\n`
if (args.report) {
  const destination = path.resolve(args.report)
  fs.mkdirSync(path.dirname(destination), { recursive: true })
  fs.writeFileSync(destination, output)
}
process.stdout.write(output)
if (errors.length) process.exit(1)
