import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const shaPattern = /^[0-9a-f]{40}$/

function value(name, fallback = '') {
  return process.env[name]?.trim() || fallback
}

function booleanValue(name) {
  return value(name) === 'true'
}

function changedFiles(rollbackSha, targetSha) {
  if (!shaPattern.test(rollbackSha) || !shaPattern.test(targetSha)) {
    return { files: [], error: 'target or rollback SHA was invalid before receipt generation' }
  }

  try {
    const output = execFileSync('git', ['diff', '--name-only', `${rollbackSha}..${targetSha}`], {
      encoding: 'utf8',
    })
    return {
      files: output.split('\n').map((entry) => entry.trim()).filter(Boolean),
      error: null,
    }
  } catch (error) {
    return {
      files: [],
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

function deploymentOutcome({
  targetSha,
  rollbackSha,
  targetDeployed,
  targetSmokeResult,
  rollbackAttempted,
  rollbackResult,
  finalLiveSha,
}) {
  if (targetDeployed && targetSmokeResult === 'success' && finalLiveSha === targetSha) {
    return 'verified-live'
  }
  if (rollbackAttempted && rollbackResult === 'success' && finalLiveSha === rollbackSha) {
    return 'rolled-back-to-approved-sha'
  }
  if (rollbackAttempted && rollbackResult !== 'success') {
    return 'rollback-failed'
  }
  if (targetDeployed) {
    return 'target-deployed-but-unverified'
  }
  return 'failed-before-deploy'
}

function main() {
  const targetSha = value('URAI_TARGET_SHA', 'missing-target-sha')
  const rollbackSha = value('URAI_ROLLBACK_SHA', 'missing-rollback-sha')
  const environment = value('URAI_DEPLOY_ENVIRONMENT', 'unknown')
  const firebaseProject = value('FIREBASE_PROJECT_ID', 'unknown')
  const publicUrl = value('URAI_DEPLOY_URL', value('URAI_REQUESTED_DEPLOY_URL')) || null
  const deploymentMode = value('URAI_DEPLOYMENT_MODE', 'framework')
  const targetDeployed = booleanValue('URAI_TARGET_DEPLOYED')
  const targetSmokeResult = value('URAI_TARGET_SMOKE_RESULT', 'not-run')
  const rollbackAttempted = booleanValue('URAI_ROLLBACK_ATTEMPTED')
  const rollbackResult = value('URAI_ROLLBACK_RESULT', 'not-run')
  const finalLiveSha = value('URAI_FINAL_LIVE_SHA') || null
  const jobStatus = value('URAI_JOB_STATUS', 'unknown')
  const runId = process.env.GITHUB_RUN_ID ? Number(process.env.GITHUB_RUN_ID) : null
  const targetIsValid = shaPattern.test(targetSha)
  const rollbackIsValid = shaPattern.test(rollbackSha)
  const diff = changedFiles(rollbackSha, targetSha)
  const outcome = deploymentOutcome({
    targetSha,
    rollbackSha,
    targetDeployed,
    targetSmokeResult,
    rollbackAttempted,
    rollbackResult,
    finalLiveSha,
  })
  const classification = outcome === 'verified-live' ? 'VERIFIED LIVE' : 'BLOCKED'
  const receiptKey = targetIsValid ? targetSha : `failed-run-${runId || Date.now()}`
  const outputPath = value('URAI_DEPLOYMENT_RECEIPT_PATH')
    || `operations/receipts/releases/${receiptKey}/deployment-receipt.json`

  const caveats = [
    'Physical Quest, Vision Pro, and handheld AR certification remain separate device gates.',
    'Paid provider generation requires separate immutable provider receipts.',
  ]
  if (diff.error) caveats.push(`Changed-file evidence could not be generated: ${diff.error}`)
  if (!targetIsValid) caveats.push('Target SHA input was invalid or absent.')
  if (!rollbackIsValid) caveats.push('Rollback SHA input was invalid or absent.')
  if (outcome === 'rolled-back-to-approved-sha') {
    caveats.push('The target release failed verification and the approved rollback SHA was restored; the target remains uncertified.')
  }
  if (outcome === 'rollback-failed') {
    caveats.push('Automatic rollback failed. Immediate operator intervention and environment containment are required.')
  }
  if (outcome === 'target-deployed-but-unverified') {
    caveats.push('The target was deployed but did not complete external verification and no successful rollback was recorded.')
  }
  if (outcome === 'failed-before-deploy') {
    caveats.push('The workflow failed before a verified target deployment was recorded.')
  }

  const receipt = {
    receiptId: `URAI-SPATIAL-DEPLOY-${targetIsValid ? targetSha.slice(0, 12) : `RUN-${runId || 'UNKNOWN'}`}`,
    recordedAt: new Date().toISOString(),
    classification,
    outcome,
    repository: 'LifeLoggerAI/urai-spatial',
    branch: process.env.GITHUB_REF_NAME || 'manual-release',
    commitSha: targetIsValid ? targetSha : null,
    pullRequest: value('URAI_PULL_REQUEST') || null,
    issue: value('URAI_RELEASE_ISSUE') || null,
    changedFiles: diff.files,
    workflowRuns: [
      {
        name: process.env.GITHUB_WORKFLOW || 'URAI Spatial Deploy',
        runId,
        status: 'completed',
        conclusion: jobStatus,
        artifact: `urai-spatial-deployment-receipt-${targetSha}`,
      },
    ],
    validation: {
      commands: [
        'corepack pnpm verify:release',
        deploymentMode === 'static' ? 'corepack pnpm build:static' : 'corepack pnpm build',
        'corepack pnpm smoke:deployed',
        'corepack pnpm smoke:live',
        'corepack pnpm smoke:home-xr:live',
      ],
      testResult: targetDeployed ? 'release gates completed before target deployment' : 'release gates did not produce a recorded target deployment',
      buildResult: targetDeployed ? `${deploymentMode} target build and Firebase deployment completed` : `${deploymentMode} target deployment not recorded`,
      runtimeVerification: targetSmokeResult === 'success'
        ? `External smoke passed against ${publicUrl || 'the configured deployment URL'}`
        : `Target external smoke result: ${targetSmokeResult}`,
      screenshotsOrArtifacts: [],
    },
    deployment: {
      target: `Firebase ${firebaseProject}`,
      environment,
      requestedSha: targetIsValid ? targetSha : null,
      targetDeployed,
      targetSmokeResult,
      finalLiveSha: finalLiveSha && shaPattern.test(finalLiveSha) ? finalLiveSha : null,
      publicUrls: publicUrl ? [publicUrl] : [],
      rollbackSha: rollbackIsValid ? rollbackSha : null,
      rollbackAttempted,
      rollbackResult,
    },
    provider: null,
    remainingCaveats: caveats,
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8')
  console.log(`URAI_DEPLOYMENT_RECEIPT=${outputPath}`)
  console.log(`URAI_DEPLOYMENT_OUTCOME=${outcome}`)
  console.log(`URAI_FINAL_LIVE_SHA=${receipt.deployment.finalLiveSha || 'not-recorded'}`)
}

main()
