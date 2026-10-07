// Transport tags derived from the governed twenty-locale preparation set.
// Per-response language does not grant native review, voice identity or release acceptance.
export const URAI_CONTENT_LANGUAGES = [
  ['en','en-US','ltr'], ['zh-Hans','zh-CN','ltr'], ['hi','hi-IN','ltr'], ['es','es-ES','ltr'], ['fr','fr-FR','ltr'],
  ['ar','ar-SA','rtl'], ['bn','bn-BD','ltr'], ['pt-BR','pt-BR','ltr'], ['ru','ru-RU','ltr'], ['ur','ur-PK','rtl'],
  ['id','id-ID','ltr'], ['de','de-DE','ltr'], ['ja','ja-JP','ltr'], ['sw','sw-KE','ltr'], ['tr','tr-TR','ltr'],
  ['vi','vi-VN','ltr'], ['fil','fil-PH','ltr'], ['ko','ko-KR','ltr'], ['it','it-IT','ltr'], ['fa','fa-IR','rtl'],
] as const
export type UraiContentLanguageTag = typeof URAI_CONTENT_LANGUAGES[number][1]
export const URAI_CONTENT_LANGUAGE_TAGS = URAI_CONTENT_LANGUAGES.map(row => row[1])

export function contentLanguage(value: unknown = 'en-US') {
  if (typeof value !== 'string' || value.length > 35 || /[\r\n]/.test(value)) return null
  const normalized = value.trim().replace(/_/g, '-').toLowerCase()
  const row = URAI_CONTENT_LANGUAGES.find(([locale, tag]) => locale.toLowerCase() === normalized || tag.toLowerCase() === normalized)
  return row ? { locale:row[0], speechTag:row[1], direction:row[2] } : null
}

export function contentLanguageProps(value: unknown) {
  const language = contentLanguage(value)
  return language ? {lang:language.speechTag, dir:language.direction} : {}
}
