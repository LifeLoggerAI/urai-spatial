import { existsSync, lstatSync, mkdirSync, realpathSync, writeFileSync } from 'node:fs'
import { dirname, extname, posix, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const appRoot = dirname(here)
const repoRoot = dirname(appRoot)
const publicRoot = resolve(appRoot, 'public')
const canonicalPublicRoot = realpathSync(publicRoot)
const manifestPath = resolve(appRoot, 'src/spatial/assets/assetManifest.ts')
const reportPath = resolve(repoRoot, 'docs/ASSET_VERIFICATION_REPORT.md')

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

function normalizeManifestPath(value) {
  const raw = String(value ?? '').trim().replace(/\\/g, '/')
  const withoutLeadingSlash = raw.replace(/^\/+/, '')
  const normalized = posix.normalize(withoutLeadingSlash)
  const unsafe =
    !raw ||
    raw.includes('\0') ||
    normalized === '.' ||
    normalized === '..' ||
    normalized.startsWith('../') ||
    posix.isAbsolute(normalized)
  return { raw, normalized, unsafe }
}

const normalizedEntries = manifest.map((asset) => ({
  asset,
  normalizedPath: normalizeManifestPath(asset.path),
}))
const duplicateIds = new Set()
const duplicatePaths = new Set()
const seenIds = new Set()
const seenPaths = new Set()
for (const { asset, normalizedPath } of normalizedEntries) {
  const id = String(asset.id ?? '').trim()
  if (seenIds.has(id)) duplicateIds.add(id)
  else seenIds.add(id)
  if (seenPaths.has(normalizedPath.normalized)) duplicatePaths.add(normalizedPath.normalized)
  else seenPaths.add(normalizedPath.normalized)
}

const rows = normalizedEntries.map(({ asset, normalizedPath }) => {
  const abs = resolve(publicRoot, normalizedPath.normalized)
  const lexicalPathInsidePublic =
    !normalizedPath.unsafe &&
    abs !== publicRoot &&
    abs.startsWith(`${publicRoot}${sep}`)
  let exists = false
  let regularFile = false
  let symbolicLink = false
  let realPathInsidePublic = false
  let realPath = ''
  if (lexicalPathInsidePublic && existsSync(abs)) {
    try {
      const stats = lstatSync(abs)
      exists = true
      symbolicLink = stats.isSymbolicLink()
      realPath = realpathSync(abs)
      realPathInsidePublic =
        realPath !== canonicalPublicRoot &&
        realPath.startsWith(`${canonicalPublicRoot}${sep}`)
      regularFile = stats.isFile() && !symbolicLink && realPathInsidePublic
    } catch {
      exists = true
      regularFile = false
      realPathInsidePublic = false
    }
  }
  const allowed = extensionByType[asset.type] ?? []
  const extension = extname(normalizedPath.normalized).toLowerCase()
  const extensionOk = allowed.includes(extension)
  const requiredFile = asset.status === 'ready' || asset.status === 'fallback'
  const pathInsidePublic = lexicalPathInsidePublic && (!exists || realPathInsidePublic)
  const blocking = requiredFile && (!pathInsidePublic || !exists || !regularFile)
  return {
    ...asset,
    normalizedPath: normalizedPath.normalized,
    exists,
    regularFile,
    symbolicLink,
    pathInsidePublic,
    lexicalPathInsidePublic,
    realPathInsidePublic,
    extensionOk,
    requiredFile,
    blocking,
    duplicateId: duplicateIds.has(String(asset.id ?? '').trim()),
    duplicatePath: duplicatePaths.has(normalizedPath.normalized),
    relativePath: pathInsidePublic ? relative(repoRoot, abs) : 'outside-public-root',
    realPath: realPathInsidePublic ? relative(repoRoot, realPath) : '',
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
  `- Non-regular or escaped ready/fallback files: ${summary.nonRegularRequiredFiles}`,
  `- Invalid or escaped paths: ${summary.invalidPaths}`,
  `- Invalid extensions: ${summary.invalidExtensions}`,
  `- Duplicate asset IDs: ${summary.duplicateIds}`,
  `- Duplicate normalized asset paths: ${summary.duplicatePaths}`,
  `- Blocking ready/fallback asset failures: ${summary.blocking}`,
  '',
  '## Asset Rows',
  '',
  '| ID | Type | Surface | Status | Priority | Extension | Path | File | Required | Duplicate |',
  '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ...rows.map((asset) => `| ${asset.id} | ${asset.type} | ${asset.targetSurface} | ${asset.status} | ${asset.priority} | ${asset.extensionOk ? 'ok' : 'bad'} | ${asset.pathInsidePublic ? 'inside-public' : 'invalid'} | ${asset.regularFile ? 'regular' : asset.symbolicLink ? 'symlink' : asset.exists ? 'non-regular-or-escaped' : 'pending'} | ${asset.requiredFile ? 'yes' : 'no'} | ${asset.duplicateId || asset.duplicatePath ? 'yes' : 'no'} |`),
  '',
  '## Gate Result',
  '',
  failed
    ? 'FAIL: a ready/fallback file is missing, non-regular, symlinked or escaped; a path is unsafe; an extension is invalid; or an ID/normalized path is duplicated.'
    : 'PASS: every ready/fallback asset is a regular in-root file and the manifest has valid unique IDs, normalized paths and extensions.',
  '',
]

mkdirSync(dirname(reportPath), { recursive: true })
writeFileSync(reportPath, `${lines.join('\n')}\n`)
console.log(lines.join('\n'))

if (failed) process.exit(1)
