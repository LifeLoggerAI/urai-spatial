#!/usr/bin/env node
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

if (process.env.GITHUB_ACTIONS === 'true') forgeV218()

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 64 * 1024 * 1024,
    ...options,
  })
  if (result.stdout) process.stdout.write(result.stdout)
  if (result.stderr) process.stderr.write(result.stderr)
  if (result.error) throw result.error
  if ((result.status ?? 1) !== 0) throw new Error(`${command} ${args.join(' ')} failed with status ${result.status}`)
  return result.stdout || ''
}

function forgeV218() {
  const repoRoot = process.cwd()
  const generator = path.join(repoRoot, 'urai-tier1/scripts/blender/generate-life-map-sanctuary-v218.py')
  if (!fs.existsSync(generator)) {
    console.log('V218 generator absent; registered asset forge remains unchanged.')
    return
  }

  console.log('=== V218 BLENDER FORGE START ===')
  run('sudo', ['apt-get', 'update'])
  run('sudo', ['apt-get', 'install', '-y', '--no-install-recommends', 'blender'])
  const blenderVersion = run('blender', ['--version'])
  const blenderRun = spawnSync('blender', ['--background', '--factory-startup', '--python', generator], {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 128 * 1024 * 1024,
  })
  const blenderLog = `${blenderRun.stdout || ''}${blenderRun.stderr || ''}`
  process.stdout.write(blenderLog)
  if (blenderRun.error) throw blenderRun.error
  if ((blenderRun.status ?? 1) !== 0) throw new Error(`Blender V218 generation failed with status ${blenderRun.status}`)

  const glb = path.join(repoRoot, 'urai-tier1/public/assets/urai/life-map-production/authored-v218/life-map-memory-sanctuary-v218.glb')
  const master = path.join(repoRoot, 'source-masters/07_3D_SOURCE_MODELS/PR-1177/life-map-v218/life-map-memory-sanctuary-v218.blend')
  const preview = path.join(repoRoot, 'source-masters/07_3D_SOURCE_MODELS/PR-1177/life-map-v218/life-map-memory-sanctuary-v218-preview.png')
  for (const [label, file] of [['runtime GLB', glb], ['editable BLEND master', master], ['source preview', preview]]) {
    if (!fs.existsSync(file) || fs.statSync(file).size === 0) throw new Error(`V218 ${label} missing: ${file}`)
  }

  run('npx', ['--yes', '@gltf-transform/cli@4.2.1', 'validate', glb])
  const glbBytes = fs.readFileSync(glb)
  if (glbBytes.subarray(0, 4).toString('ascii') !== 'glTF') throw new Error('V218 GLB header invalid')
  if (glbBytes.readUInt32LE(4) !== 2) throw new Error('V218 GLB is not glTF 2.0')
  if (glbBytes.readUInt32LE(8) !== glbBytes.length) throw new Error('V218 GLB declared length mismatch')

  const artifactRoot = path.join(repoRoot, '.urai-artifacts/launch-critical-candidate-bundle/lifemap-v218-forge')
  fs.mkdirSync(artifactRoot, { recursive: true })
  const exactHead = process.env.URAI_EXACT_HEAD || process.env.GITHUB_SHA || 'unknown'
  const provenance = {
    schemaVersion: 1,
    version: 'V218',
    exactHead,
    generator: 'urai-tier1/scripts/blender/generate-life-map-sanctuary-v218.py',
    externalAssets: [],
    license: 'Original URAI-authored deterministic geometry; no third-party assets',
    blenderVersion: blenderVersion.trim().split(/\r?\n/)[0],
    runtimeGlb: {
      path: 'urai-tier1/public/assets/urai/life-map-production/authored-v218/life-map-memory-sanctuary-v218.glb',
      bytes: glbBytes.length,
      sha256: digest(glbBytes),
    },
  }
  fs.writeFileSync(path.join(artifactRoot, 'provenance.json'), `${JSON.stringify(provenance, null, 2)}\n`)
  fs.writeFileSync(path.join(artifactRoot, 'blender-version.txt'), blenderVersion)
  fs.writeFileSync(path.join(artifactRoot, 'blender-forge.log'), blenderLog)
  fs.copyFileSync(generator, path.join(artifactRoot, path.basename(generator)))
  fs.copyFileSync(glb, path.join(artifactRoot, path.basename(glb)))
  fs.copyFileSync(master, path.join(artifactRoot, path.basename(master)))
  fs.copyFileSync(preview, path.join(artifactRoot, path.basename(preview)))

  const names = fs.readdirSync(artifactRoot).filter((name) => name !== 'SHA256SUMS.txt').sort()
  const sums = names.map((name) => `${digest(fs.readFileSync(path.join(artifactRoot, name)))}  ${name}`).join('\n') + '\n'
  fs.writeFileSync(path.join(artifactRoot, 'SHA256SUMS.txt'), sums)
  console.log(JSON.stringify({ ok: true, exactHead, artifactRoot: path.relative(repoRoot, artifactRoot), ...provenance.runtimeGlb }, null, 2))
  console.log('=== V218 BLENDER FORGE END ===')
}

function digest(payload) {
  return crypto.createHash('sha256').update(payload).digest('hex')
}
