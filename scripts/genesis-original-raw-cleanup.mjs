/**
 * Fail-closed cleanup of ephemeral UNENCRYPTED original-app recordings.
 * Call after capture succeeds or fails, before publishing any HOLD receipt.
 * This removes only the expected `<output>/raw` directory and never the
 * sealed clips or verification evidence stored alongside it.
 */
import path from 'node:path'
import { lstat, rm } from 'node:fs/promises'

export async function cleanupUnsealedCapture(outputDirectory, rawDirectory) {
  if (typeof outputDirectory !== 'string' || typeof rawDirectory !== 'string') {
    throw new Error('UNSEALED_CAPTURE_CLEANUP_PATH_INVALID')
  }
  const root = path.resolve(outputDirectory)
  const expected = path.join(root, 'raw')
  if (path.resolve(rawDirectory) !== expected || path.dirname(expected) !== root) {
    throw new Error('UNSEALED_CAPTURE_CLEANUP_PATH_MISMATCH')
  }
  const entry = await lstat(expected).catch(error => {
    if (error.code === 'ENOENT') return null
    throw error
  })
  if (!entry) return { cleaned: true, existed: false }
  // A symlink would make the containment evidence ambiguous. Never follow it.
  if (!entry.isDirectory() || entry.isSymbolicLink()) {
    throw new Error('UNSEALED_CAPTURE_CLEANUP_UNSAFE_DIRECTORY')
  }
  await rm(expected, { recursive: true, force: true, maxRetries: 2, retryDelay: 150 })
  return { cleaned: true, existed: true }
}

// Independent scene captures are NOT a continuous cinematic proof, but their
// CDP JPEGs and WebM recordings are still plaintext. Discard them in both
// success and failure paths; retain only encrypted seals and HOLD receipts.
const FALLBACK_SCENES = new Set(['home', 'orb', 'ascent', 'life-map', 'focus', 'replay', 'return'])

export async function cleanupUnsealedFallbackCapture(outputDirectory, sceneName) {
  if (typeof outputDirectory !== 'string' || !FALLBACK_SCENES.has(sceneName)) {
    throw new Error('UNSEALED_FALLBACK_CLEANUP_SCENE_INVALID')
  }
  const root = path.resolve(outputDirectory)
  const rootEntry = await lstat(root)
  if (!rootEntry.isDirectory() || rootEntry.isSymbolicLink()) {
    throw new Error('UNSEALED_FALLBACK_CLEANUP_ROOT_UNSAFE')
  }
  const sceneFolder = path.join(root, sceneName)
  const rawVideo = path.join(root, `${sceneName}.webm`)
  const inspect = async target => lstat(target).catch(error => {
    if (error.code === 'ENOENT') return null
    throw error
  })
  // Validate both paths before touching either: never traverse a symlink.
  const [folder, video] = await Promise.all([inspect(sceneFolder), inspect(rawVideo)])
  if (folder && (!folder.isDirectory() || folder.isSymbolicLink())) {
    throw new Error('UNSEALED_FALLBACK_CLEANUP_FOLDER_UNSAFE')
  }
  if (video && (!video.isFile() || video.isSymbolicLink())) {
    throw new Error('UNSEALED_FALLBACK_CLEANUP_VIDEO_UNSAFE')
  }
  if (folder) await rm(sceneFolder, { recursive: true, maxRetries: 2, retryDelay: 150 })
  if (video) await rm(rawVideo)
  return { cleaned: true, removedFolder: !!folder, removedVideo: !!video }
}
