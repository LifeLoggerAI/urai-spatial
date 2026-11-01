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
