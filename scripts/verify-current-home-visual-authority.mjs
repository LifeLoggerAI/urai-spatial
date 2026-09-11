import { access, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = fileURLToPath(new URL('..', import.meta.url))
const authorityPath = path.join(repoRoot, 'urai-tier1/src/app/currentHomeVisualAuthority.json')
const authority = JSON.parse(await readFile(authorityPath, 'utf8'))

function fail(message) {
  throw new Error(`Current Home visual authority invalid: ${message}`)
}

if (authority.schemaVersion !== 'urai-home-visual-authority-1') fail(`unsupported schema ${String(authority.schemaVersion)}`)
for (const field of ['rendererOwner', 'artRevision', 'worldIdentifier', 'proofSchema']) {
  if (typeof authority[field] !== 'string' || !authority[field].trim()) fail(`missing ${field}`)
}
if (!Array.isArray(authority.runtimeAssets) || authority.runtimeAssets.length < 4) fail('runtimeAssets must contain the current renderer/art inventory')
if (new Set(authority.runtimeAssets).size !== authority.runtimeAssets.length) fail('runtimeAssets contains duplicate entries')
if (!authority.runtimeAssets.includes(authority.rendererOwner)) fail('runtimeAssets does not include rendererOwner')
if (!authority.runtimeAssets.includes('HomeVisualAuthority.tsx')) fail('runtimeAssets does not include HomeVisualAuthority.tsx')
if (authority.runtimeAssets.includes('HomeWorldProductionV225PolishV2.tsx')) fail('superseded V225PolishV2 cannot be a current runtime asset')

const layoutRoot = path.join(repoRoot, 'urai-tier1/src/spatial/layout')
const assetRoot = path.join(repoRoot, 'urai-tier1/public/assets/urai/home-production/cc0')
for (const asset of authority.runtimeAssets) {
  const candidate = asset.endsWith('.tsx') ? path.join(layoutRoot, asset) : path.join(assetRoot, asset)
  try {
    await access(candidate)
  } catch {
    fail(`declared runtime asset is missing: ${asset}`)
  }
}

const ownerModule = path.basename(authority.rendererOwner, '.tsx')
const barrel = await readFile(path.join(layoutRoot, 'HomeWorldProduction.tsx'), 'utf8')
if (!barrel.includes(`./${ownerModule}`) || !barrel.includes('as HomeWorldProduction')) fail('HomeWorldProduction barrel does not expose rendererOwner as the canonical renderer')

const runtime = await readFile(path.join(repoRoot, 'urai-tier1/src/app/AssetDrivenHomeWorld.tsx'), 'utf8')
for (const token of [
  "import currentHomeVisualAuthority from './currentHomeVisualAuthority.json'",
  'currentHomeVisualAuthority.worldIdentifier',
  'currentHomeVisualAuthority.artRevision',
  'currentHomeVisualAuthority.runtimeAssets.join',
]) {
  if (!runtime.includes(token)) fail(`runtime does not consume structured authority token: ${token}`)
}
if (/PRODUCTION CERTIFIED|retained-pixel-pass|pixel-certified/.test(runtime)) fail('runtime contains an unearned visual certification marker')

const renderer = await readFile(path.join(layoutRoot, authority.rendererOwner), 'utf8')
for (const token of [
  "import { HomeAtmosphericSky } from '@/spatial/assets/HomeAtmosphericSky'",
  '<HomeAtmosphericSky reducedMotion={p.reducedMotion}/>',
]) {
  if (!renderer.includes(token)) fail(`renderer does not preserve atmospheric visual-authority chain token: ${token}`)
}

const atmosphere = await readFile(path.join(repoRoot, 'urai-tier1/src/spatial/assets/HomeAtmosphericSky.tsx'), 'utf8')
for (const token of [
  "import { HomeVisualAuthority } from '../layout/HomeVisualAuthority'",
  '<HomeVisualAuthority />',
]) {
  if (!atmosphere.includes(token)) fail(`atmosphere does not mount final visual authority token: ${token}`)
}

const visualAuthority = await readFile(path.join(layoutRoot, 'HomeVisualAuthority.tsx'), 'utf8')
for (const token of [
  'object.visible = false',
  'previousRaycast.set(object, object.raycast)',
  'object.raycast = () => {}',
  'object.raycast = raycast',
  '!isTransparentInteractionSurface(object)',
]) {
  if (!visualAuthority.includes(token)) fail(`visual ownership guard missing fail-closed interaction token: ${token}`)
}

process.stdout.write(`${JSON.stringify({
  ok: true,
  schemaVersion: authority.schemaVersion,
  rendererOwner: authority.rendererOwner,
  artRevision: authority.artRevision,
  worldIdentifier: authority.worldIdentifier,
  proofSchema: authority.proofSchema,
  runtimeAssets: authority.runtimeAssets,
}, null, 2)}\nCURRENT_HOME_VISUAL_AUTHORITY_OK\n`)
