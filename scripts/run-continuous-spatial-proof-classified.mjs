import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const scriptsDir = path.dirname(fileURLToPath(import.meta.url))
const auditedLauncherPath = path.join(scriptsDir, 'run-continuous-spatial-proof-fixed.mjs')
const captureSourcePath = path.join(scriptsDir, 'capture-continuous-spatial-proof.mjs')
const compositedCapturePath = path.join(scriptsDir, '.capture-continuous-spatial-proof-composited.mjs')
const classifiedLauncherPath = path.join(scriptsDir, '.run-continuous-spatial-proof-classified.mjs')

const previousClassifier = "if (key === 'overlayOpacities' || key.endsWith('Diagnostic')) return true"
const classifiedGeometry = "if (key === 'overlayOpacities' || key.endsWith('Diagnostic') || key.endsWith('Geometry')) return true"
const auditedCaptureBinding = "const sourcePath = path.join(scriptsDir, 'capture-continuous-spatial-proof.mjs')"
const compositedCaptureBinding = "const sourcePath = path.join(scriptsDir, '.capture-continuous-spatial-proof-composited.mjs')"
const cancelledAnimationCapture = "animations: 'disabled'"
const compositedAnimationCapture = "animations: 'allow'"

let capture = await readFile(captureSourcePath, 'utf8')
const cancelledCaptureCount = capture.split(cancelledAnimationCapture).length - 1
if (cancelledCaptureCount !== 1) {
  throw new Error(`continuous visual proof screenshot mode expected exactly one audited occurrence; found ${cancelledCaptureCount}`)
}
capture = capture.replace(cancelledAnimationCapture, compositedAnimationCapture)
await writeFile(compositedCapturePath, capture)

let launcher = await readFile(auditedLauncherPath, 'utf8')
if (!launcher.includes(previousClassifier)) {
  throw new Error('continuous visual proof classifier no longer matches the audited schema-18 launcher')
}
if (!launcher.includes(auditedCaptureBinding)) {
  throw new Error('continuous visual proof capture binding no longer matches the audited launcher')
}
launcher = launcher.replace(previousClassifier, classifiedGeometry)
launcher = launcher.replace(auditedCaptureBinding, compositedCaptureBinding)
await writeFile(classifiedLauncherPath, launcher)
await import(`${pathToFileURL(classifiedLauncherPath).href}?exactHead=${encodeURIComponent(process.env.URAI_EXACT_HEAD || 'local')}`)
