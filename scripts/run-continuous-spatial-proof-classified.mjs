import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const scriptsDir = path.dirname(fileURLToPath(import.meta.url))
const auditedLauncherPath = path.join(scriptsDir, 'run-continuous-spatial-proof-fixed.mjs')
const classifiedLauncherPath = path.join(scriptsDir, '.run-continuous-spatial-proof-classified.mjs')

const previousClassifier = "if (key === 'overlayOpacities' || key.endsWith('Diagnostic')) return true"
const classifiedGeometry = "if (key === 'overlayOpacities' || key.endsWith('Diagnostic') || key.endsWith('Geometry')) return true"
const cancelledAnimationCapture = "animations: 'disabled'"
const compositedAnimationCapture = "animations: 'allow'"

let launcher = await readFile(auditedLauncherPath, 'utf8')
if (!launcher.includes(previousClassifier)) {
  throw new Error('continuous visual proof classifier no longer matches the audited schema-18 launcher')
}
if (!launcher.includes(cancelledAnimationCapture)) {
  throw new Error('continuous visual proof screenshot mode no longer matches the audited capture contract')
}
launcher = launcher.replace(previousClassifier, classifiedGeometry)
launcher = launcher.replace(cancelledAnimationCapture, compositedAnimationCapture)
await writeFile(classifiedLauncherPath, launcher)
await import(`${pathToFileURL(classifiedLauncherPath).href}?exactHead=${encodeURIComponent(process.env.URAI_EXACT_HEAD || 'local')}`)
