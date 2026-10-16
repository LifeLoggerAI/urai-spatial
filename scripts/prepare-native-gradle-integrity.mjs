import fs from 'node:fs/promises'
import { constants } from 'node:fs'
import path from 'node:path'
import { createHash, randomUUID } from 'node:crypto'
import { pathToFileURL } from 'node:url'

// Published upstream checksums. A toolchain upgrade requires new verified bytes.
export const ANDROID_GRADLE_INTEGRITY = Object.freeze({
  version: '8.14.3',
  distributionUrl: 'https\\://services.gradle.org/distributions/gradle-8.14.3-all.zip',
  distributionSha256: 'ed1a8d686605fd7c23bdf62c7fc7add1c5b23b2bbc3721e661934ef4a4911d7c',
  distributionChecksumSource: 'https://services.gradle.org/distributions/gradle-8.14.3-all.zip.sha256',
  wrapperJarSha256: '7d3a4ac4de1c32b59bc6a4eb8ecb8e612ccd0cf1ae1e99f66902da64df296172',
  wrapperChecksumSource: 'https://services.gradle.org/distributions/gradle-8.14.3-wrapper.jar.sha256',
})
const EXPECTED = Object.freeze({
  distributionBase: 'GRADLE_USER_HOME', distributionPath: 'wrapper/dists',
  distributionUrl: ANDROID_GRADLE_INTEGRITY.distributionUrl,
  networkTimeout: '10000', validateDistributionUrl: 'true',
  zipStoreBase: 'GRADLE_USER_HOME', zipStorePath: 'wrapper/dists',
  distributionSha256Sum: ANDROID_GRADLE_INTEGRITY.distributionSha256,
})
async function readRegularFile(file, maxBytes) {
  const handle = await fs.open(file, constants.O_RDONLY | constants.O_NOFOLLOW)
  try {
    const stat = await handle.stat()
    if (!stat.isFile() || stat.size > maxBytes) throw new Error('ANDROID_GRADLE_FILE_IDENTITY_INVALID')
    return { bytes: await handle.readFile(), stat }
  } finally { await handle.close() }
}
export async function prepareAndroidGradleIntegrity(androidProject) {
  const directory = path.resolve(androidProject, 'gradle/wrapper')
  const folder = await fs.lstat(directory)
  if (!folder.isDirectory() || folder.isSymbolicLink()) throw new Error('ANDROID_GRADLE_WRAPPER_DIRECTORY_INVALID')
  const propertiesPath = path.join(directory, 'gradle-wrapper.properties')
  const jar = await readRegularFile(path.join(directory, 'gradle-wrapper.jar'), 43764)
  if (createHash('sha256').update(jar.bytes).digest('hex') !== ANDROID_GRADLE_INTEGRITY.wrapperJarSha256) throw new Error('ANDROID_GRADLE_WRAPPER_JAR_CHECKSUM_MISMATCH')
  const properties = await readRegularFile(propertiesPath, 16384)
  const text = new TextDecoder('utf-8', { fatal: true }).decode(properties.bytes)
  const entries = new Map()
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || /^\s*[#!]/.test(line)) continue
    // Refuse alternate separators, Unicode or continuation aliases that could
    // shadow a Java-properties key; admit the actual pinned vendor format only.
    const match = /^([A-Za-z][A-Za-z0-9]*)=([^\r\n]*)$/.exec(line)
    if (!match || !Object.hasOwn(EXPECTED, match[1])) throw new Error('ANDROID_GRADLE_PROPERTIES_FORMAT_UNSUPPORTED')
    if (entries.has(match[1])) throw new Error('ANDROID_GRADLE_PROPERTIES_DUPLICATE_KEY')
    if (match[2] !== EXPECTED[match[1]]) throw new Error('ANDROID_GRADLE_PROPERTIES_VALUE_MISMATCH')
    entries.set(match[1], match[2])
  }
  for (const key of Object.keys(EXPECTED)) {
    if (key !== 'distributionSha256Sum' && !entries.has(key)) throw new Error('ANDROID_GRADLE_PROPERTIES_REQUIRED_KEY_MISSING')
  }
  const added = !entries.has('distributionSha256Sum')
  if (added) {
    const current = await fs.lstat(propertiesPath)
    if (!current.isFile() || current.isSymbolicLink() || current.ino !== properties.stat.ino || current.size !== properties.stat.size || current.mtimeMs !== properties.stat.mtimeMs) throw new Error('ANDROID_GRADLE_PROPERTIES_CHANGED_DURING_PREPARATION')
    const temporary = path.join(directory, `.urai-gradle-integrity-${randomUUID()}.tmp`)
    try {
      await fs.writeFile(temporary, `${text}${text.endsWith('\n') ? '' : '\n'}distributionSha256Sum=${ANDROID_GRADLE_INTEGRITY.distributionSha256}\n`, { flag: 'wx', mode: properties.stat.mode & 0o777 })
      await fs.rename(temporary, propertiesPath)
    } finally { await fs.rm(temporary, { force: true }) }
  }
  return {
    schema: 'urai-native-gradle-integrity-preparation-v1',
    gradleVersion: ANDROID_GRADLE_INTEGRITY.version,
    distributionSha256: ANDROID_GRADLE_INTEGRITY.distributionSha256,
    wrapperJarSha256: ANDROID_GRADLE_INTEGRITY.wrapperJarSha256,
    distributionChecksumAdded: added,
    signingPerformed: false, releaseAccepted: false,
    physicalDeviceAccepted: false, storeAccepted: false,
  }
}
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  if (process.argv.length !== 4 || process.argv[2] !== '--android-project' || !process.argv[3]) throw new Error('ANDROID_PROJECT_ARGUMENT_REQUIRED')
  console.log(JSON.stringify(await prepareAndroidGradleIntegrity(process.argv[3]), null, 2))
}
