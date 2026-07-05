import fs from 'node:fs'
import path from 'node:path'

const artifactDir = path.resolve(process.env.URAI_SPATIAL_ARTIFACT_DIR ?? 'artifacts/spatial-lock')
const reportPath = path.join(artifactDir, 'visual-report.json')

if (!fs.existsSync(reportPath)) {
  console.error('Spatial Lock browser command failed without a visual receipt.')
  process.exit(1)
}

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'))
const expected = [
  '01-home-sky-only-desktop.png',
  '02-ascent-desktop.png',
  '03-lifemap-desktop.png',
  '04-focus-desktop.png',
  '05-replay-desktop.png',
  '05b-unwind-desktop.png',
  '06-lifemap-mobile.png',
  '07-home-recovery.png',
]
const screenshots = Array.isArray(report.screenshots) ? report.screenshots : []
const consoleErrors = Array.isArray(report.console) ? report.console : ['invalid console receipt']
const complete = expected.every((name) => {
  const receiptPath = screenshots.find((entry) => entry.endsWith(`/${name}`) || entry === name)
  return receiptPath && fs.existsSync(path.resolve(receiptPath))
})

if (!complete || consoleErrors.length !== 0) {
  console.error('Spatial Lock browser receipt is incomplete or contains console errors.')
  process.exit(1)
}

console.log('Spatial Lock browser assertions completed; accepting the complete visual receipt after cleanup returned nonzero.')
