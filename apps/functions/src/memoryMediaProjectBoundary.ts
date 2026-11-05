/**
 * Exact Firebase project authority for the private-memory server endpoints.
 *
 * Only reviewed entries below can opt into real staging. An operator setting
 * environment variables alone is NOT authorization for a new cloud project.
 * Deliberately empty until an isolated project/bucket has been independently
 * approved and added in a separate reviewed source change.
 */
export const APPROVED_MEDIA_STAGING_BUCKETS: Readonly<Record<string, string>> = Object.freeze({
  // 'urai-approved-staging': 'urai-approved-staging.firebasestorage.app',
})

type Environment = Readonly<Record<string, string | undefined>>
const PRODUCTION_PROJECT = 'urai-4dc1d'
const STAGING_MODE = 'EXPLICIT_NONPRODUCTION_ONLY'
const STAGING_KEYS = ['URAI_MEDIA_STAGING_ENABLE', 'URAI_MEDIA_STAGING_PROJECT', 'URAI_MEDIA_STAGING_BUCKET'] as const
const EMULATOR_KEYS = ['FIREBASE_AUTH_EMULATOR_HOST', 'FIRESTORE_EMULATOR_HOST', 'FIREBASE_STORAGE_EMULATOR_HOST',
  'STORAGE_EMULATOR_HOST', 'FUNCTIONS_EMULATOR'] as const

function denied(): never { throw new Error('MEMORY_MEDIA_PROJECT_UNBOUND') }
function exactConfig(value: string | undefined): Record<string, unknown> | null {
  if (!value || !value.startsWith('{')) return null
  try {
    const parsed: unknown = JSON.parse(value)
    return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown> : null
  } catch { return null }
}

/**
 * Server process environment only. Never pass client request fields here.
 * The optional registry argument is exclusively for deterministic unit tests;
 * the production call uses the checked-in, initially empty approval registry.
 */
export function resolveMemoryMediaProject(env: Environment,
  approvedStaging: Readonly<Record<string, string>> = APPROVED_MEDIA_STAGING_BUCKETS): string {
  const ids = [env.GCLOUD_PROJECT, env.GCP_PROJECT, env.GOOGLE_CLOUD_PROJECT]
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
  const project = ids[0]
  if (!project || ids.some(value => value !== project)) denied()

  const stagingConfigured = STAGING_KEYS.some(key => env[key] !== undefined)
  const emulatorConfigured = EMULATOR_KEYS.some(key => Boolean(env[key]))
  const firebaseConfig = exactConfig(env.FIREBASE_CONFIG)

  if (project === PRODUCTION_PROJECT) {
    // Exact old production binding, with no staging override or emulator.
    if (stagingConfigured || emulatorConfigured || (env.FIREBASE_CONFIG &&
      (!firebaseConfig || firebaseConfig.projectId !== project))) denied()
    return project
  }

  if (env.FUNCTIONS_EMULATOR === 'true') {
    // Only genuinely fictional demo projects; no staging option in an emulator.
    if (stagingConfigured || !/^demo-[a-z0-9-]{1,50}$/.test(project)
      || (env.FIREBASE_CONFIG && (!firebaseConfig || firebaseConfig.projectId !== project))) denied()
    return project
  }

  // Non-emulator, nonproduction: no inferred project from its name alone.
  // A reviewed source registry entry AND exact server/deployment configuration
  // are both required, so copycat/lookalike project IDs fail closed.
  if (emulatorConfigured || env.URAI_MEDIA_STAGING_ENABLE !== STAGING_MODE
    || env.URAI_MEDIA_STAGING_PROJECT !== project) denied()
  if (!/^urai-(?:[a-z0-9]+-)*(?:staging|sandbox|test)(?:-[a-z0-9]+)?$/.test(project)
    || /(?:^|-)(?:prod|production|live|4dc1d)(?:-|$)/.test(project)) denied()
  const bucket = env.URAI_MEDIA_STAGING_BUCKET
  if (!bucket || (bucket !== project + '.appspot.com' && bucket !== project + '.firebasestorage.app')
    || !Object.prototype.hasOwnProperty.call(approvedStaging, project) || approvedStaging[project] !== bucket) denied()

  // FIREBASE_CONFIG is supplied by the deployed Firebase Functions runtime:
  // require both the real runtime project AND its default bucket to match the
  // separately approved source binding. Env values cannot silently redirect
  // server writes to another project or a public/production bucket.
  if (!firebaseConfig || firebaseConfig.projectId !== project || firebaseConfig.storageBucket !== bucket
    || (env.FIREBASE_STORAGE_BUCKET && env.FIREBASE_STORAGE_BUCKET !== bucket)) denied()
  return project
}
