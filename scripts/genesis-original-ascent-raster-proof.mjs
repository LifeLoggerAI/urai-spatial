/**
 * HOLD-only decoded-pixel test for authentic original-application Ascent footage.
 * A DOM progress flag, readiness-only frame counter, or single hard cut is not
 * evidence of continuous visual ascent. Decode the center of an actual WebM,
 * measure movement throughout its interior, and fail closed when motion stalls.
 * This does not animate, enhance, interpolate, synthesize, or publish frames.
 */
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const exec = promisify(execFile)
export const RASTER_WIDTH = 128
export const RASTER_HEIGHT = 72
export const SOURCE_ASPECT_FPS = 4

export function inspectAscentRasterFrames(decoded, { width = RASTER_WIDTH, height = RASTER_HEIGHT } = {}) {
  if (!Buffer.isBuffer(decoded) || !Number.isInteger(width) || !Number.isInteger(height) ||
      width < 8 || height < 8 || width * height > 100000 || decoded.length % (width * height) !== 0) {
    throw new Error('ASCENT_RASTER_DECODED_BYTES_INVALID')
  }
  const bytesPerFrame = width * height
  const frames = decoded.length / bytesPerFrame
  if (frames < 12) throw new Error(`ASCENT_RASTER_FRAMES_INSUFFICIENT:${frames}`)
  // Ignore the first and last fifth: entry and navigation cuts cannot substitute
  // for sustained movement while the camera is actually ascending.
  const edge = Math.max(2, Math.floor(frames * .20))
  const begin = edge
  const end = frames - edge
  const pairs = []
  for (let n = begin + 1; n < end; n++) {
    const a = (n - 1) * bytesPerFrame, b = n * bytesPerFrame
    let changed = 0, sum = 0
    for (let k = 0; k < bytesPerFrame; k++) {
      const delta = Math.abs(decoded[a + k] - decoded[b + k])
      sum += delta
      if (delta >= 10) changed++
    }
    const meanDelta = sum / bytesPerFrame
    const changedFraction = changed / bytesPerFrame
    pairs.push({ meanDelta, changedFraction, strong: meanDelta >= 1.2 && changedFraction >= .04 })
  }
  if (pairs.length < 6) throw new Error('ASCENT_INTERIOR_RASTER_INTERVAL_TOO_SHORT')
  const split = Math.floor(pairs.length / 2)
  const first = pairs.slice(0, split).filter(x => x.strong).length
  const second = pairs.slice(split).filter(x => x.strong).length
  const strongPairs = first + second
  const evidence = {
    verified: strongPairs >= 6 && first >= 3 && second >= 3,
    sampleMethod: 'decoded_original_webm_center_crop_grayscale_4fps',
    frames, interiorPairs: pairs.length, strongPairs,
    firstHalfStrongPairs: first, secondHalfStrongPairs: second,
    interiorMeanDelta: Number((pairs.reduce((s,x) => s + x.meanDelta,0)/pairs.length).toFixed(3)),
    strongMotionDefinition: { minMeanGrayscaleDifference: 1.2, minFractionPixelsDelta10: .04 },
  }
  return evidence
}

export async function proveAscentRasterMotion(webmFile) {
  if (typeof webmFile !== 'string' || !webmFile.endsWith('.webm')) {
    throw new Error('ASCENT_SOURCE_WEBM_REQUIRED')
  }
  const { stdout } = await exec('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-i', webmFile,
    '-vf', `fps=${SOURCE_ASPECT_FPS},crop=iw*0.70:ih*0.70,scale=${RASTER_WIDTH}:${RASTER_HEIGHT}:flags=area,format=gray`,
    '-an', '-f', 'rawvideo', '-pix_fmt', 'gray', 'pipe:1',
  ], { encoding: 'buffer', timeout: 90000, maxBuffer: 8 * 1024 * 1024 })
  const proof = inspectAscentRasterFrames(stdout)
  if (!proof.verified) throw new Error(`SOURCE_ASCENT_INTERIOR_RASTER_MOTION_UNPROVEN:${JSON.stringify(proof)}`)
  return proof
}
