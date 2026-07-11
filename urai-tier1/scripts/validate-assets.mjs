import { existsSync, lstatSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, extname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const appRoot = dirname(here)
const repoRoot = dirname(appRoot)
const publicRoot = resolve(appRoot, 'public')
const manifestPath = join(appRoot, 'src/spatial/assets/assetManifest.ts')
const reportPath = join(repoRoot, 'docs/ASSET_VERIFICATION_REPORT.md')

const source = existsSync(manifestPath) ? await import(`file://${manifestPath}?t=${Date.now()}`) : null
const manifest = source?.uraiSpatialAssetManifest ?? []

const extensionByType = {
  model: ['.glb', '.gltf'],
  texture: ['.json', '.png', '.jpg', '.jpeg', '.webp', '.ktx2'],
  skybox: ['.hdr', '.exr', '.png', '.jpg', '.jpeg', '.webp', '.json'],
  portal: ['.glb', '.gltf', '.json'],
  world: ['.glb', '.gltf', '.json'],
  ui: ['.svg', '.png', '.webp', '.json'],
  audio: ['.mp3', '.wav', '.ogg'],
  fallback: ['.glb', '.gltf', '.json', '.svg', '.png', '.webp'],
}

const duplicateIds = new Set()
const duplicatePaths = new Set()
const seenIds = new Set()
const seenPaths = new Set()
for (const asset of manifest) {
  if (seenIds.has(asset.id)) duplicateIds.add(asset.id)
  else seenIds.add(asset.id)
  if (seenPaths.has(asset.path)) duplicatePaths.add(asset.path)
  else seenPaths.add(asset.path)
}

const rows = manifest.map((asset) => {
  const publicPath = asset.path.startsWith('/') ? asset.path.slice(1) : asset.path
  const abs = resolve(publicRoot, publicPath)
  const pathInsidePublic = abs !== publicRoot && abs.startsWith(`${publicRoot}${sep}`)
  let exists = false
  let regularFile = false
  let symbolicLink = false
  if (pathInsidePublic && existsSync(abs)) {
    const stats = lstatSync(abs)
    exists = true
    symbolicLink = stats.isSymbolicLink()
    regularFile = stats.isFile() && !symbolicLink
  }
  const allowed = extensionByType[asset.type] ?? []
  const extension = extname(asset.path).toLowerCase()
  const extensionOk = allowed.includes(extension)
  const requiredFile = asset.status === 'ready' || asset.status === 'fallback'
  const blocking = requiredFile && (!pathInsidePublic || !exists || !regularFile)
  return {
    ...asset,
    exists,
    regularFile,
    symbolicLink,
    pathInsidePublic,
    extensionOk,
    requiredFile,
    blocking,
    duplicateId: duplicateIds.has(asset.id),
    duplicatePath: duplicatePaths.has(asset.path),
    relativePath: pathInsidePublic ? relative(repoRoot, abs) : 'outside-public-root',
  }
})

const summary = {
  total: rows.length,
  ready: rows.filter((asset) => asset.status === 'ready').length,
  fallback: rows.filter((asset) => asset.status === 'fallback').length,
  candidate: rows.filter((asset) => asset.status === 'candidate').length,
  future: rows.filter((asset) => asset.status === 'future').length,
  missing: rows.filter((asset) => asset.status === 'missing').length,
  missingFiles: rows.filter((asset) => !asset.exists).length,
  missingRequiredFiles: rows.filter((asset) => asset.requiredFile && !asset.exists).length,
  nonRegularRequiredFiles: rows.filter((asset) => asset.requiredFile && asset.exists && !asset.regularFile).length,
  invalidPaths: rows.filter((asset) => !asset.pathInsidePublic).length,
  invalidExtensions: rows.filter((asset) => !asset.extensionOk).length,
  duplicateIds: duplicateIds.size,
  duplicatePaths: duplicatePaths.size,
  blocking: rows.filter((asset) => asset.blocking).length,
}

const failed = summary.blocking > 0
  || summary.invalidPaths > 0
  || summary.invalidExtensions > 0
  || summary.duplicateIds > 0
  || summary.duplicatePaths > 0

const lines = [
  '# URAI Asset Verification Report',
  '',
  `Generated: ${new Date().toISOString()}`,
  '',
  '## Summary',
  '',
  `- Total manifest entries: ${summary.total}`,
  `- Ready assets: ${summary.ready}`,
  `- Explicit fallback assets: ${summary.fallback}`,
  `- Candidate assets: ${summary.candidate}`,
  `- Future generation slots: ${summary.future}`,
  `- Missing status entries: ${summary.missing}`,
  `- Paths without files yet: ${summary.missingFiles}`,
  `- Missing ready/fallback files: ${summary.missingRequiredFiles}`,
  `- Non-regular or symlinked ready/fallback files: ${summary.nonRegularRequiredFiles}`,
  `- Paths outside public root: ${summary.invalidPaths}`,
  `- Invalid extensions: ${summary.invalidExtensions}`,
  `- Duplicate asset IDs: ${summary.duplicateIds}`,
  `- Duplicate asset paths: ${summary.duplicatePaths}`,
  `- Blocking ready/fallback asset failures: ${summary.blocking}`,
  '',
  '## Asset Rows',
  '',
  '| ID | Type | Surface | Status | Priority | Extension | Path | File | Required | Duplicate |',
  '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ...rows.map((asset) => `| ${asset.id} | ${asset.type} | ${asset.targetSurface} | ${asset.status} | ${asset.priority} | ${asset.extensionOk ? 'ok' : 'bad'} | ${asset.pathInsidePublic ? 'inside-public' : 'invalid'} | ${asset.regularFile ? 'regular' : asset.symbolicLink ? 'symlink' : asset.exists ? 'non-regular' : 'pending'} | ${asset.requiredFile ? 'yes' : 'no'} | ${asset.duplicateId || asset.duplicatePath ? 'yes' : 'no'} |`),
  '',
  '## Gate Result',
  '',
  failed
    ? 'FAIL: a ready/fallback file is missing or non-regular, a path escapes the public root, an extension is invalid, or an ID/path is duplicated.'
    : 'PASS: every ready/fallback asset is a regular in-root file and the manifest has valid unique IDs, paths and extensions.',
  '',
]

mkdirSync(dirname(reportPath), { recursive: true })
writeFileSync(reportPath, `${lines.join('\n')}\n`)
console.log(lines.join('\n'))

if (failed) process.exit(1)
