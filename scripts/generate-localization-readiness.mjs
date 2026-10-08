import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { localizationMessageBindings } from './lib/localization-message-bindings.mjs'
import {
  URAI_LAUNCH_LOCALES,
  URAI_NATIVE_REVIEWED_LOCALES,
  URAI_RTL_LOCALES,
  URAI_SOURCE_MESSAGES,
  localizationCompleteness,
  runtimeUraiLocale,
  uraiTextDirection,
} from '../urai-tier1/src/lib/i18n/locales.ts'

const exactHead = String(process.env.URAI_EXACT_HEAD || '').trim()
if (!/^[0-9a-f]{40}$/.test(exactHead)) throw new Error('URAI_EXACT_HEAD must be a full lowercase SHA')

const outputDir = path.resolve(process.env.URAI_LOCALIZATION_OUTPUT || 'artifacts/localization-readiness')
await mkdir(outputDir, { recursive: true })

const locales = URAI_LAUNCH_LOCALES.map((locale) => {
  const completeness = localizationCompleteness(locale)
  const nativeReviewed = URAI_NATIVE_REVIEWED_LOCALES.has(locale)
  const runtimeLocale = runtimeUraiLocale(locale)
  const runtimeAdmitted = runtimeLocale === locale
  const blockingReasons = []
  if (!completeness.complete) blockingReasons.push('CATALOG_INCOMPLETE')
  if (!nativeReviewed) blockingReasons.push('NATIVE_REVIEW_REQUIRED')
  if (URAI_RTL_LOCALES.has(locale) && !runtimeAdmitted) blockingReasons.push('RTL_VISUAL_QA_REQUIRED_BEFORE_ADMISSION')

  if (runtimeAdmitted && (!completeness.complete || !nativeReviewed)) {
    throw new Error(`LOCALE_ADMITTED_WITHOUT_REQUIRED_REVIEW:${locale}`)
  }

  return {
    locale,
    direction: uraiTextDirection(locale),
    translated: completeness.translated,
    missingMessageIds: completeness.missingMessageIds,
    total: completeness.total,
    complete: completeness.complete,
    nativeReviewed,
    nativeReviewRequired: completeness.nativeReviewRequired,
    runtimeLocale,
    runtimeAdmitted,
    productionAdmission: runtimeAdmitted ? 'admitted' : 'blocked',
    rtlVisualQaRequired: URAI_RTL_LOCALES.has(locale),
    translationAuthority: locale === 'en'
      ? 'authoritative-source'
      : completeness.complete
        ? 'machine-prepared-native-review-required'
        : completeness.translated > 0 ? 'machine-prepared-partial-native-review-required' : 'not-yet-provided',
    blockingReasons,
  }
})

// Catalog coverage is measured only against registered strings. It is not a
// percentage of the product. Record the real scoped UI consumers separately.
const consumerPaths = [
  'src/app/HomeSpatialRuntimeLayer.tsx',
  'src/spatial/layout/HomeWorldProductionPolished.tsx',
  'src/lib/i18n/JourneyOfflineNotice.tsx',
  'src/app/settings/DeviceSettingsClient.tsx',
  'src/components/settings/LanguageSettings.tsx',
  'src/components/lifemap/LifeMapSemanticNavigator.tsx',
  'src/app/focus/FocusChamberClient.tsx',
  'src/app/replay/CinematicReplayClient.tsx',
  'src/app/replay/ReplayProductControls.tsx',
  'src/spatial/memory/MemoryMediaAttachment.tsx',
  'src/lib/i18n/journeyControlCopy.ts',
]
const consumers = await Promise.all(consumerPaths.map(async (file) => {
  const source = await readFile(new URL(`../urai-tier1/${file}`, import.meta.url), 'utf8')
  const messageIds = localizationMessageBindings(source, URAI_SOURCE_MESSAGES, file)
  return {file, messageIds, numberFormatter:source.includes('locale.number('), dateFormatter:source.includes('locale.date(')}
}))
const wiredMessageIds = [...new Set(consumers.flatMap(consumer => consumer.messageIds))].sort()

const receipt = {
  schemaVersion: 'urai-localization-readiness-1',
  exactHead,
  generatedAt: new Date().toISOString(),
  containsPrivateUserData: false,
  governedLocaleCount: URAI_LAUNCH_LOCALES.length,
  runtimeAdmittedLocales: locales.filter((locale) => locale.runtimeAdmitted).map((locale) => locale.locale),
  preparationOnlyLocales: locales.filter((locale) => !locale.runtimeAdmitted).map((locale) => locale.locale),
  uiCoverage: {
    scope:'CORE_JOURNEY_COPY_EXPLICIT_WORKING_PREVIEW',
    registeredMessageCount:Object.keys(URAI_SOURCE_MESSAGES).length,
    wiredMessageCount:wiredMessageIds.length,
    wiredMessageIds,
    unwiredMessageIds:Object.keys(URAI_SOURCE_MESSAGES).filter(id => !wiredMessageIds.includes(id)),
    consumers,
    wholeProductTranslated:false,
    sensitiveFallback:'reviewed locale only',
    remaining:'Registered core journey, selected-memory controls and owned file attachment copy are governed. Missing preparation entries use reviewed English with matching language/direction; the per-locale missingMessageIds are unresolved translations, not native acceptance. Other product routes, private values, policy copy and provider-generated language remain outside this scope. Native linguistic, RTL visual, speech, AT and device acceptance remain pending.',
  },
  locales,
}

await writeFile(path.join(outputDir, 'localization-readiness.json'), JSON.stringify(receipt, null, 2) + '\n')
console.log(JSON.stringify(receipt, null, 2))
