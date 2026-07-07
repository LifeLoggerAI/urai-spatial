import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const appRoot = dirname(here)
const repoRoot = dirname(appRoot)
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
  fallback: ['.json', '.svg', '.png', '.webp'],
}

const rows = manifest.map((asset) => {
  const publicPath = asset.path.startsWith('/') ? asset.path.slice(1) : asset.path
  const abs = join(appRoot, 'public', publicPath.replace(/^assets\//, 'assets/'))
  const exists = existsSync(abs)
  const allowed = extensionByType[asset.type] ?? []
  const extensionOk = allowed.some((ext) => asset.path.endsWith(ext))
  const blocking = asset.priority === 'critical' && asset.status === 'ready' && !exists
  return { ...asset, exists, extensionOk, blocking, relativePath: relative(repoRoot, abs) }
})

const summary = {
  total: rows.length,
  ready: rows.filter((asset) => asset.status === 'ready').length,
  placeholders: rows.filter((asset) => asset.status === 'placeholder').length,
  future: rows.filter((asset) => asset.status === 'future').length,
  missing: rows.filter((asset) => asset.status === 'missing').length,
  missingFiles: rows.filter((asset) => !asset.exists).length,
  invalidExtensions: rows.filter((asset) => !asset.extensionOk).length,
  blocking: rows.filter((asset) => asset.blocking).length,
}

const lines = [
  '# URAI Asset Verification Report',
  '',
  `Generated: ${new Date().toISOString()}`,
  '',
  '## Summary',
  '',
  `- Total manifest entries: ${summary.total}`,
  `- Ready assets: ${summary.ready}`,
  `- Procedural placeholders: ${summary.placeholders}`,
  `- Future generation slots: ${summary.future}`,
  `- Missing status entries: ${summary.missing}`,
  `- Paths without files yet: ${summary.missingFiles}`,
  `- Invalid extensions: ${summary.invalidExtensions}`,
  `- Blocking critical ready assets missing: ${summary.blocking}`,
  '',
  '## Asset Rows',
  '',
  '| ID | Type | Surface | Status | Priority | Extension | File |',
  '| --- | --- | --- | --- | --- | --- | --- |',
  ...rows.map((asset) => `| ${asset.id} | ${asset.type} | ${asset.targetSurface} | ${asset.status} | ${asset.priority} | ${asset.extensionOk ? 'ok' : 'bad'} | ${asset.exists ? 'present' : 'pending'} |`),
  '',
  '## Gate Result',
  '',
  summary.blocking === 0 && summary.invalidExtensions === 0 ? 'PASS: no blocking ready critical asset failures.' : 'FAIL: blocking ready critical asset failure or invalid extension found.',
  '',
]

mkdirSync(dirname(reportPath), { recursive: true })
writeFileSync(reportPath, `${lines.join('\n')}\n`)
console.log(lines.join('\n'))

if (summary.blocking > 0 || summary.invalidExtensions > 0) process.exit(1)
