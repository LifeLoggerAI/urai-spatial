import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const scriptsDir = path.dirname(fileURLToPath(import.meta.url))
const auditedLauncherPath = path.join(scriptsDir, 'run-continuous-spatial-proof-fixed.mjs')
const classifiedLauncherPath = path.join(scriptsDir, '.run-continuous-spatial-proof-classified.mjs')

const previousClassifier = "if (key === 'overlayOpacities' || key.endsWith('Diagnostic')) return true"
const classifiedGeometry = "if (key === 'overlayOpacities' || key.endsWith('Diagnostic') || key.endsWith('Geometry')) return true"

let launcher = await readFile(auditedLauncherPath, 'utf8')
if (!launcher.includes(previousClassifier)) {
  throw new Error('continuous visual proof classifier no longer matches the audited schema-18 launcher')
}
launcher = launcher.replace(previousClassifier, classifiedGeometry)
await writeFile(classifiedLauncherPath, launcher)
await import(`${pathToFileURL(classifiedLauncherPath).href}?exactHead=${encodeURIComponent(process.env.URAI_EXACT_HEAD || 'local')}`)
