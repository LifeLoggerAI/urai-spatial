/**
 * Internal HOLD: collect actual mounted Home R3F camera callbacks during Ascent.
 * This is only a sampler; it does not certify frame pixels or build provenance.
 * The paired Python inspector must bind the resulting log to actual decoded video.
 */
import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { lstat, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { assertPrivateEvidenceDirectory } from './genesis-private-evidence-path.mjs'

const SOURCE_RECEIPT_SCHEMA = 'urai-genesis-ascent-camera-pixel-proof-hold/v1'
const FIXTURE = 'EXPLICIT_DISCLOSED_DEMO_QUIET_RESET_NO_PERSONAL_ACCOUNT'
const ORIGINAL_SHA = '94c8a2cf68a436a0c49e80b3a09578935df12d48'

export function beginAscentCameraSampler(page, intervalMs = 75) {
  if (!page || typeof page.evaluate !== 'function') throw Error('CAPTURE_PAGE_REQUIRED')
  if (!Number.isInteger(intervalMs) || intervalMs < 25 || intervalMs > 500) throw Error('INVALID_SAMPLE_INTERVAL')
  const startedAt = Date.now()
  const samples = []
  let stopped = false
  let pending = Promise.resolve()
  const poll = async () => {
    const sample = await page.evaluate(() => {
      const host = document.querySelector('.urai-asset-home-world[data-home-primary-owner="asset-driven"]')
      if (!host || host.dataset.homeScenePhase !== 'ASCENT') return null
      const ticks = Number(host.dataset.homeAscentR3fCallbacks)
      const progress = Number(host.dataset.homeAscentProgress)
      const position = [host.dataset.homeAscentCameraX, host.dataset.homeAscentCameraY, host.dataset.homeAscentCameraZ].map(Number)
      return { ticks, progress, position }
    }).catch(() => null)
    if (!sample || !Number.isInteger(sample.ticks) || sample.ticks <= 0 ||
        !Number.isFinite(sample.progress) || sample.position.length !== 3 ||
        !sample.position.every(Number.isFinite)) return
    if (samples.length > 0 && sample.ticks <= samples.at(-1).ticks) return
    if (samples.length < 1000) {
      samples.push({seconds: +( (Date.now() - startedAt) / 1000 ).toFixed(3), ...sample})
    }
  }
  const timer = setInterval(() => { if (!stopped) pending = pending.then(poll) }, intervalMs)
  pending = pending.then(poll)
  return {
    async stop() {
      stopped = true
      clearInterval(timer)
      await pending
      return samples
    },
  }
}

async function videoDigest(file) {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(file)) hash.update(chunk)
  return hash.digest('hex')
}

async function outsideGit(file) {
  await assertPrivateEvidenceDirectory(path.dirname(path.resolve(file)), {
    gitError: 'PRIVATE_ASCENT_EVIDENCE_CANNOT_BE_INSIDE_GIT_CHECKOUT',
    symlinkError: 'PRIVATE_ASCENT_EVIDENCE_SYMLINK_PATH_FORBIDDEN',
  })
}

export async function bindAscentTelemetryToVideo({ videoFile, outputFile, applicationRevision, samples }) {
  if (!/^[a-f0-9]{40}$/.test(applicationRevision || '') || applicationRevision === ORIGINAL_SHA) {
    throw Error('CORRECTED_BUILD_SHA_REQUIRED_NOT_ORIGINAL_EXPORT')
  }
  if (!Array.isArray(samples) || samples.length < 10) throw Error('CAMERA_CALLBACK_SAMPLES_MISSING')
  await outsideGit(outputFile)
  const video = path.resolve(videoFile)
  const st = await lstat(video)
  if (!st.isFile() || st.isSymbolicLink() || st.size < 8192 || st.size > 256 * 1024 * 1024) {
    throw Error('GENUINE_CAPTURE_FILE_NOT_VERIFIED')
  }
  const receipt = {
    schema: SOURCE_RECEIPT_SCHEMA,
    applicationRevision,
    buildProvenance: 'DECLARED_SHA_NOT_INDEPENDENTLY_ATTESTED',
    sourceVideoSha256: await videoDigest(video),
    fixture: FIXTURE,
    samples,
    release: 'NO-GO/HOLD',
    humanReviewApproved: false,
  }
  await mkdir(path.dirname(path.resolve(outputFile)), {recursive: true, mode: 0o700})
  await writeFile(outputFile, JSON.stringify(receipt, null, 2) + '\n', {flag: 'wx',mode: 0o600})
  return receipt
}
