import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  URAI_LAUNCH_LOCALES,
  URAI_NATIVE_REVIEWED_LOCALES,
  URAI_RTL_LOCALES,
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
        : 'not-yet-provided',
    blockingReasons,
  }
})

const receipt = {
  schemaVersion: 'urai-localization-readiness-1',
  exactHead,
  generatedAt: new Date().toISOString(),
  containsPrivateUserData: false,
  governedLocaleCount: URAI_LAUNCH_LOCALES.length,
  runtimeAdmittedLocales: locales.filter((locale) => locale.runtimeAdmitted).map((locale) => locale.locale),
  preparationOnlyLocales: locales.filter((locale) => !locale.runtimeAdmitted).map((locale) => locale.locale),
  locales,
}

await writeFile(path.join(outputDir, 'localization-readiness.json'), JSON.stringify(receipt, null, 2) + '\n')
console.log(JSON.stringify(receipt, null, 2))
