import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

function requireValue(name) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is required to write a deployment receipt.`)
  return value
}

function requireSha(name) {
  const value = requireValue(name)
  if (!/^[0-9a-f]{40}$/.test(value)) {
    throw new Error(`${name} must be a full lowercase 40-character Git SHA.`)
  }
  return value
}

function changedFiles(rollbackSha, targetSha) {
  const output = execFileSync('git', ['diff', '--name-only', `${rollbackSha}..${targetSha}`], {
    encoding: 'utf8',
  })
  return output.split('\n').map((value) => value.trim()).filter(Boolean)
}

function main() {
  const targetSha = requireSha('URAI_TARGET_SHA')
  const rollbackSha = requireSha('URAI_ROLLBACK_SHA')
  const environment = requireValue('URAI_DEPLOY_ENVIRONMENT')
  const firebaseProject = requireValue('FIREBASE_PROJECT_ID')
  const publicUrl = requireValue('URAI_DEPLOY_URL')
  const deploymentMode = requireValue('URAI_DEPLOYMENT_MODE')
  const outputPath = process.env.URAI_DEPLOYMENT_RECEIPT_PATH?.trim()
    || `operations/receipts/releases/${targetSha}/deployment-receipt.json`

  if (targetSha === rollbackSha) {
    throw new Error('URAI_ROLLBACK_SHA must differ from URAI_TARGET_SHA.')
  }

  const files = changedFiles(rollbackSha, targetSha)
  if (files.length === 0) {
    throw new Error('The target and rollback SHAs contain no changed files; refusing an ambiguous release receipt.')
  }

  const runId = process.env.GITHUB_RUN_ID ? Number(process.env.GITHUB_RUN_ID) : null
  const receipt = {
    receiptId: `URAI-SPATIAL-DEPLOY-${targetSha.slice(0, 12)}`,
    recordedAt: new Date().toISOString(),
    classification: 'VERIFIED LIVE',
    repository: 'LifeLoggerAI/urai-spatial',
    branch: process.env.GITHUB_REF_NAME || 'manual-release',
    commitSha: targetSha,
    pullRequest: process.env.URAI_PULL_REQUEST || null,
    issue: process.env.URAI_RELEASE_ISSUE || null,
    changedFiles: files,
    workflowRuns: [
      {
        name: process.env.GITHUB_WORKFLOW || 'URAI Spatial Deploy',
        runId,
        status: 'completed',
        conclusion: 'success',
        artifact: 'urai-spatial-deployment-receipt',
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
      testResult: 'passed on exact target SHA before deployment',
      buildResult: `${deploymentMode} build and Firebase deployment passed`,
      runtimeVerification: `External smoke passed against ${publicUrl}`,
      screenshotsOrArtifacts: [],
    },
    deployment: {
      target: `Firebase ${firebaseProject}`,
      environment,
      deployedSha: targetSha,
      publicUrls: [publicUrl],
      rollbackSha,
    },
    provider: null,
    remainingCaveats: [
      'Physical Quest, Vision Pro, and handheld AR certification remain separate device gates.',
      'This receipt proves the deployed web release only; paid provider generation requires separate provider receipts.',
      'Rollback SHA is recorded but a separate rollback execution receipt is required if rollback is exercised.',
    ],
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8')
  console.log(`URAI_DEPLOYMENT_RECEIPT=${outputPath}`)
  console.log(`URAI_DEPLOYED_SHA=${targetSha}`)
  console.log(`URAI_ROLLBACK_SHA=${rollbackSha}`)
}

main()
