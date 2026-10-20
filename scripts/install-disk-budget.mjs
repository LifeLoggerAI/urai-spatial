import { statfsSync } from 'node:fs'

export const DEFAULT_INSTALL_MINIMUM_MB = 4096n

// Node 22's native filesystem API reports available blocks on the target
// filesystem without invoking POSIX df (not present on Windows).
export function availableDiskKiB({ location = '.', statfs = statfsSync } = {}) {
  const result = statfs(location, { bigint: true })
  const blockSize = BigInt(result?.bsize)
  const blocksAvailable = BigInt(result?.bavail)
  if (blockSize <= 0n || blocksAvailable < 0n) {
    throw new Error('INVALID_DISK_MEASUREMENT')
  }
  return (blockSize * blocksAvailable) / 1024n
}

export function requiredDiskMb(configured = String(DEFAULT_INSTALL_MINIMUM_MB)) {
  if (typeof configured !== 'string' || !/^[1-9][0-9]*$/.test(configured)) {
    throw new Error('INVALID_DISK_BUDGET')
  }
  const value = BigInt(configured)
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('INVALID_DISK_BUDGET')
  return value
}

export function assessInstallDiskBudget(availableKiB, configuredMinimum = String(DEFAULT_INSTALL_MINIMUM_MB)) {
  const minimumMb = requiredDiskMb(configuredMinimum)
  if (typeof availableKiB !== 'bigint' || availableKiB < 0n) {
    throw new Error('INVALID_DISK_MEASUREMENT')
  }
  const availableMb = availableKiB / 1024n
  return {
    minimumMb,
    availableMb,
    sufficient: availableKiB >= minimumMb * 1024n,
  }
}
