import { NodeIO } from '@gltf-transform/core'
import { KHRONOS_EXTENSIONS } from '@gltf-transform/extensions'
import {
  dedup,
  prune,
  resample,
  textureResize,
  draco,
} from '@gltf-transform/functions'
import draco3d from 'draco3dgltf'
import { createHash } from 'node:crypto'
import { dirname, join, resolve, basename } from 'node:path'
import { promises as fs } from 'node:fs'

const PIPELINE_VERSION = '1'

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex')
}

async function fileExists(path) {
  try {
    await fs.access(path)
    return true
  } catch {
    return false
  }
}

async function buildLocalAsset(inputPathArg, outputPathArg) {
  if (!inputPathArg) {
    throw new Error('Missing input path')
  }

  const inputPath = resolve(inputPathArg)

  if (!(await fileExists(inputPath))) {
    throw new Error(`Input file not found: ${inputPath}`)
  }

  const ext = inputPath.toLowerCase().split('.').pop()
  if (!['gltf', 'glb'].includes(ext)) {
    throw new Error(`Unsupported input type ".${ext}". Use .gltf or .glb`)
  }

  console.log(`Building asset from: ${inputPath}`)

  const originalContent = await fs.readFile(inputPath)

  const decoderModule = await draco3d.createDecoderModule()
  const encoderModule = await draco3d.createEncoderModule()

  const io = new NodeIO()
    .registerExtensions(KHRONOS_EXTENSIONS)
    .registerDependencies({
      'draco3d.decoder': decoderModule,
      'draco3d.encoder': encoderModule,
    })

  const document = await io.read(inputPath)

  await document.transform(
    prune(),
    dedup(),
    resample(),
    textureResize({ size: [1024, 1024] }),
    draco()
  )

  const optimizedContent = Buffer.from(await io.writeBinary(document))

  const originalHash = sha256(originalContent)
  const buildHash = sha256(optimizedContent)

  const outputDir = outputPathArg
    ? resolve(outputPathArg)
    : join(dirname(inputPath), 'build', buildHash)

  await fs.mkdir(outputDir, { recursive: true })

  const outputModelPath = join(outputDir, 'model.glb')
  const manifestPath = join(outputDir, 'manifest.json')

  const manifest = {
    pipelineVersion: PIPELINE_VERSION,
    createdAt: new Date().toISOString(),
    source: {
      path: inputPath,
      fileName: basename(inputPath),
      hash: originalHash,
      size: originalContent.length,
    },
    output: {
      path: outputModelPath,
      fileName: 'model.glb',
      hash: buildHash,
      size: optimizedContent.length,
      mime: 'model/gltf-binary',
    },
    inputs: {
      [basename(inputPath)]: {
        hash: originalHash,
        size: originalContent.length,
      },
    },
    outputs: {
      'model.glb': {
        hash: buildHash,
        size: optimizedContent.length,
        mime: 'model/gltf-binary',
      },
    },
  }

  await fs.writeFile(outputModelPath, optimizedContent)
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8')

  console.log(`Successfully built asset.`)
  console.log(`Output Dir : ${outputDir}`)
  console.log(`Model Path : ${outputModelPath}`)
  console.log(`Manifest   : ${manifestPath}`)
  console.log(`Build Hash : ${buildHash}`)
}

if (process.argv.length < 3) {
  console.error('Usage: node scripts/build_asset.mjs <path-to-gltf-or-glb> [output-dir]')
  process.exit(1)
}

buildLocalAsset(process.argv[2], process.argv[3]).catch((err) => {
  console.error('Asset build failed:')
  console.error(err?.stack || err)
  process.exit(1)
})