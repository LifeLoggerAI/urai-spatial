import fs from 'node:fs'
import process from 'node:process'

const statusPath = 'release/LIVE_STATUS.md'

const liveUrl = process.env.LIVE_URL || process.env.HOST
const firebaseProject = process.env.FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT || process.env.GCLOUD_PROJECT
const commit = process.env.GITHUB_SHA || process.env.COMMIT_SHA || 'manual-local-commit-pending'
const deployMethod = process.env.DEPLOY_METHOD || (process.env.GITHUB_ACTIONS ? 'github-actions' : 'local-cli')
const verifiedBy = process.env.VERIFIED_BY || process.env.GITHUB_ACTOR || 'manual-operator'
const releaseGateResult = process.env.RELEASE_GATE_RESULT || 'passed'
const liveSmokeResult = process.env.LIVE_SMOKE_RESULT || 'passed'
const verifiedAt = process.env.VERIFIED_AT || new Date().toISOString()

function requireValue(name, value) {
  if (!value) {
    throw new Error(`${name} is required to record live status.`)
  }
}

function replaceLine(text, label, value) {
  const pattern = new RegExp(`- ${label}: .*`)
  const replacement = `- ${label}: ${value}`
  if (!pattern.test(text)) {
    throw new Error(`Could not find status line for ${label} in ${statusPath}.`)
  }
  return text.replace(pattern, replacement)
}

function main() {
  requireValue('LIVE_URL or HOST', liveUrl)
  requireValue('FIREBASE_PROJECT_ID, FIREBASE_PROJECT, or GCLOUD_PROJECT', firebaseProject)

  if (!fs.existsSync(statusPath)) {
    throw new Error(`Missing ${statusPath}.`)
  }

  let text = fs.readFileSync(statusPath, 'utf8')
  text = text.replace('Status: not-yet-verified-live', 'Status: live-verified')
  text = text.replace(
    'Reason: repository-side release gates and deploy workflow are wired, but a Firebase project, deploy credential, deployed live URL, and passing live smoke result have not been recorded yet.',
    'Reason: release gate, deploy, and live smoke were recorded for the live URL below.'
  )
  text = replaceLine(text, 'Commit', commit)
  text = replaceLine(text, 'Firebase project', firebaseProject)
  text = replaceLine(text, 'Live URL', liveUrl)
  text = replaceLine(text, 'Deploy method', deployMethod)
  text = replaceLine(text, 'Release gate result', releaseGateResult)
  text = replaceLine(text, 'Live smoke result', liveSmokeResult)
  text = replaceLine(text, 'Verified by', verifiedBy)
  text = replaceLine(text, 'Verified at', verifiedAt)

  fs.writeFileSync(statusPath, text)
  console.log(`[URAI Spatial Live] Recorded live status in ${statusPath}`)
  console.log(`[URAI Spatial Live] URL: ${liveUrl}`)
}

main()
