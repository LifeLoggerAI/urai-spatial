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
const geometryReturn = `return {
          height: rect.height,`
const portaledGeometryReturn = `return {
          bodyPortaled: element.parentElement === document.body && element.getAttribute('data-portal-owner') === 'document-body',
          height: rect.height,`
const compactDeclaration = 'const selectedJourneyRailCompact = selectedJourneyRailGeometry.height >= 60'
const portaledCompactDeclaration = `const selectedJourneyRailBodyPortaled = selectedJourneyRailGeometry.bodyPortaled === true
      const selectedJourneyRailCompact = selectedJourneyRailGeometry.height >= 60`
const receiptDeclaration = `singleSelectedActionOwner,
        selectedJourneyRailCompact,`
const portaledReceiptDeclaration = `singleSelectedActionOwner,
        selectedJourneyRailBodyPortaled,
        selectedJourneyRailCompact,`

let capture = await readFile(captureSourcePath, 'utf8')
const cancelledCaptureCount = capture.split(cancelledAnimationCapture).length - 1
if (cancelledCaptureCount !== 1) {
  throw new Error(`continuous visual proof screenshot mode expected exactly one audited occurrence; found ${cancelledCaptureCount}`)
}
capture = capture.replace(cancelledAnimationCapture, compositedAnimationCapture)
await writeFile(compositedCapturePath, capture)

let launcher = await readFile(auditedLauncherPath, 'utf8')
for (const [label, needle] of [
  ['classifier', previousClassifier],
  ['capture binding', auditedCaptureBinding],
  ['journey geometry return', geometryReturn],
  ['journey compact declaration', compactDeclaration],
  ['journey receipt declaration', receiptDeclaration],
]) {
  if (!launcher.includes(needle)) throw new Error(`continuous visual proof ${label} no longer matches the audited launcher`)
}
launcher = launcher.replace(previousClassifier, classifiedGeometry)
launcher = launcher.replace(auditedCaptureBinding, compositedCaptureBinding)
launcher = launcher.replace(geometryReturn, portaledGeometryReturn)
launcher = launcher.replace(compactDeclaration, portaledCompactDeclaration)
launcher = launcher.replace(receiptDeclaration, portaledReceiptDeclaration)
await writeFile(classifiedLauncherPath, launcher)
await import(`${pathToFileURL(classifiedLauncherPath).href}?exactHead=${encodeURIComponent(process.env.URAI_EXACT_HEAD || 'local')}`)
