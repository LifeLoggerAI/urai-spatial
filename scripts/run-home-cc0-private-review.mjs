#!/usr/bin/env node
// Explicitly private, nonproduction Home review of original, hash-pinned CC0
// photographic PBR source assets. This is NOT an asset-promotion mechanism.
// Usage (from repository root): node scripts/run-home-cc0-private-review.mjs [preflight|run|clean]
import { spawn, spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const tier = path.join(root, 'urai-tier1')
const existingReview = path.join(root, 'scripts/home-cc0-source-review.mjs')
const receipt = path.join(root, 'operations/assets/candidates/home-polyhaven-cc0-dev-review-1.json')
const action = process.argv[2] || 'run'
const releaseApproved = false
const allowed = ['run', 'preflight', 'clean']
if (!allowed.includes(action)) throw new Error('Usage: node scripts/run-home-cc0-private-review.mjs run|preflight|clean')

const reviewEnv = { ...process.env,
  NODE_ENV: 'development',
  NEXT_PUBLIC_URAI_HOME_CC0_DEV_REVIEW: 'true',
  URAI_CC0_DEV_RUNNER: 'acknowledge-nonproduction-only',
  URAI_HOME_LOCAL_CC0_REVIEW: 'true',
}

function refuseUnapprovedContext() {
  if (process.env.NODE_ENV === 'production' || process.env.CI === 'true'
    || process.env.URAI_FIREBASE_STATIC_EXPORT === 'true') {
    throw new Error('Refusing private CC0 review from a production, CI or static-export context')
  }
  if (!existsSync(existingReview) || !existsSync(receipt) || !existsSync(path.join(tier, 'package.json'))) {
    throw new Error('The original UrAi source/review authority is missing')
  }
  const manifest = JSON.parse(readFileSync(receipt, 'utf8'))
  if (manifest.classification !== 'NONPRODUCTION_CANDIDATE_UNAPPROVED'
    || manifest.releaseApproved !== false || manifest.reviewApproved !== false
    || manifest.license !== 'CC0-1.0' || manifest.files?.length !== 11) {
    throw new Error('Original CC0 authority was altered; do not stage')
  }
}

function sourceReview(step) {
  const result = spawnSync(process.execPath, [existingReview, step],
    { cwd: root, env: reviewEnv, stdio: 'inherit', windowsHide: false })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error('Governed Home CC0 '+step+' failed with '+String(result.status))
}

if (action === 'clean') {
  sourceReview('clean')
  sourceReview('assert-excluded')
} else {
  refuseUnapprovedContext()
  if (action === 'preflight') {
    console.log(JSON.stringify({ok:true,mode:'LOCAL_DEVELOPMENT_REVIEW_ONLY',
      license:'CC0-1.0',sourceFiles:11,releaseApproved,productionPromotion:false,
      dedicatedBuildOutput:'.next-home-cc0-review',url:'http://127.0.0.1:3001/home'}))
  } else {
    // The existing script validates pinned provider hosts, file lengths, hashes
    // and glTF dependencies. Never reimplement or bypass those fences here.
    try {
      sourceReview('acquire')
      sourceReview('verify-source')
      sourceReview('stage')
    } catch (error) {
      sourceReview('clean')
      throw error
    }

    let nextBin
    try {
      const requireTier = createRequire(pathToFileURL(path.join(tier, 'package.json')))
      nextBin = requireTier.resolve('next/dist/bin/next')
    } catch (error) {
      sourceReview('clean')
      throw new Error('Frozen workspace dependencies required before CC0 review: '+String(error))
    }

    console.log('URAI HOME CC0 REVIEW — unapproved development-only materials; no founder final-art acceptance')
    console.log('Open http://127.0.0.1:3001/home and compare with production Home.')
    console.log('Stop with Ctrl+C. If interrupted abruptly, run: node scripts/run-home-cc0-private-review.mjs clean')
    let finished = false
    const child = spawn(process.execPath, [nextBin, 'dev', '--hostname', '127.0.0.1', '--port', '3001'], {
      cwd: tier, env: reviewEnv, stdio: 'inherit', windowsHide: false,
    })
    function finish(code) {
      if (finished) return
      finished = true
      try { sourceReview('clean'); sourceReview('assert-excluded') }
      catch (error) { console.error('CC0 review cleanup failed:',error); code = 1 }
      process.exitCode = code
    }
    child.once('error', error => { console.error('Home review dev server failed:',error); finish(1) })
    child.once('exit', (code, signal) => finish(code ?? (signal ? 130 : 1)))
    for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
      if (!finished && !child.killed) child.kill('SIGTERM')
    })
  }
}
