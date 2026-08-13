import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const runnerPath = path.resolve('scripts/capture-lifemap-founder-proof-fixed.mjs')
const bridgePath = path.resolve('scripts/founder-playwright-phase-bridge.mjs')
const materializedRunnerPath = path.resolve('scripts/.capture-lifemap-founder-proof-runtime.mjs')
const proofDir = path.resolve(process.env.URAI_PROOF_DIR || 'artifacts/lifemap-founder-proof')

function replaceExact(source, from, to, expectedCount, label) {
  const count = source.split(from).length - 1
  if (count !== expectedCount) throw new Error(`${label} expected ${expectedCount} audited occurrence(s); found ${count}`)
  return source.split(from).join(to)
}

function sha256(content) {
  return createHash('sha256').update(content).digest('hex')
}

const syntax = spawnSync(process.execPath, ['--check', runnerPath], { encoding: 'utf8' })
if (syntax.status !== 0) {
  const detail = [syntax.stdout, syntax.stderr].filter(Boolean).join('\n').trim()
  throw new Error(`Checked-in Founder capture runner failed syntax validation${detail ? `:\n${detail}` : ''}`)
}
const bridgeSyntax = spawnSync(process.execPath, ['--check', bridgePath], { encoding: 'utf8' })
if (bridgeSyntax.status !== 0) {
  const detail = [bridgeSyntax.stdout, bridgeSyntax.stderr].filter(Boolean).join('\n').trim()
  throw new Error(`Checked-in Founder phase bridge failed syntax validation${detail ? `:\n${detail}` : ''}`)
}

const checkedInSource = await readFile(runnerPath, 'utf8')
let materializedSource = replaceExact(
  checkedInSource,
  '    const box = await scene.boundingBox()',
  `    const box = await scene.evaluate((element) => {\n      const rect = element.getBoundingClientRect()\n      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }\n    })`,
  1,
  'canonical root DOM geometry observation',
)
materializedSource = replaceExact(
  materializedSource,
  '  const box = await canvas.boundingBox()',
  `  const box = await canvas.evaluate((element) => {\n    const rect = element.getBoundingClientRect()\n    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }\n  })`,
  1,
  'canvas DOM geometry observation',
)

if ((materializedSource.match(/getBoundingClientRect\(\)/g) || []).length !== 2) {
  throw new Error('Founder geometry materializer must contain exactly two read-only DOM rectangle observations')
}
if (/\.click\(|dispatchEvent\(|history\.|location\.(?:assign|replace)|setAttribute\(['"]data-life-map-phase/.test(materializedSource.slice(0, materializedSource.indexOf('async function readRootState')))) {
  throw new Error('Founder geometry materializer introduced a forbidden interaction or production-state mutation')
}

await mkdir(proofDir, { recursive: true })
await writeFile(materializedRunnerPath, materializedSource)
const materializedSyntax = spawnSync(process.execPath, ['--check', materializedRunnerPath], { encoding: 'utf8' })
if (materializedSyntax.status !== 0) {
  const detail = [materializedSyntax.stdout, materializedSyntax.stderr].filter(Boolean).join('\n').trim()
  await unlink(materializedRunnerPath).catch(() => {})
  throw new Error(`Materialized Founder capture runner failed syntax validation${detail ? `:\n${detail}` : ''}`)
}
await writeFile(path.join(proofDir, 'founder-geometry-observer.json'), `${JSON.stringify({
  schemaVersion: 'urai-founder-geometry-observer-1',
  source: path.relative(process.cwd(), runnerPath),
  checkedInSourceSha256: sha256(checkedInSource),
  materializedSourceSha256: sha256(materializedSource),
  replacements: ['canonical-root-dom-rect', 'canvas-dom-rect'],
  observer: 'Element.getBoundingClientRect',
  mutation: 'none',
}, null, 2)}\n`)

console.log(`FOUNDER_CAPTURE_SYNTAX_OK ${runnerPath}`)
console.log(`FOUNDER_PHASE_BRIDGE_SYNTAX_OK ${bridgePath}`)
console.log(`FOUNDER_GEOMETRY_MATERIALIZER_OK ${materializedRunnerPath}`)
try {
  if (!process.argv.includes('--validate-only')) {
    await import(pathToFileURL(bridgePath).href)
    await import(pathToFileURL(materializedRunnerPath).href)
  }
} finally {
  await unlink(materializedRunnerPath).catch(() => {})
}
