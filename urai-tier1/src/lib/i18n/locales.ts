import { URAI_CORE_CATALOGS, URAI_CORE_MESSAGES } from './coreMessages'

export const URAI_LAUNCH_LOCALES = [
  'en','zh-Hans','hi','es','fr','ar','bn','pt-BR','ru','ur',
  'id','de','ja','sw','tr','vi','fil','ko','it','fa',
] as const

export type UraiLaunchLocale = typeof URAI_LAUNCH_LOCALES[number]
export type UraiTextDirection = 'ltr' | 'rtl'

export const URAI_RTL_LOCALES = new Set<UraiLaunchLocale>(['ar','ur','fa'])

// Runtime language/direction may activate only after the locale is complete and
// explicitly native-reviewed. Keep an unreviewed preference separate from the
// DOM language so assistive technology is not told English fallback copy is translated.
export const URAI_NATIVE_REVIEWED_LOCALES = new Set<UraiLaunchLocale>(['en'])

const BASE_LANGUAGE: Partial<Record<string, UraiLaunchLocale>> = {
  zh: 'zh-Hans',
  pt: 'pt-BR',
}

export function isUraiLaunchLocale(value: string | null | undefined): value is UraiLaunchLocale {
  return Boolean(value && URAI_LAUNCH_LOCALES.includes(value as UraiLaunchLocale))
}

export function normalizeUraiLocale(value: string | null | undefined): UraiLaunchLocale | null {
  if (!value) return null
  const candidate = value.trim().replace('_','-')
  if (isUraiLaunchLocale(candidate)) return candidate
  const lower = candidate.toLowerCase()
  const exact = URAI_LAUNCH_LOCALES.find(locale => locale.toLowerCase() === lower)
  if (exact) return exact
  const base = lower.split('-')[0]
  if (BASE_LANGUAGE[base]) return BASE_LANGUAGE[base]!
  const launchBase = URAI_LAUNCH_LOCALES.find(locale => locale.toLowerCase() === base)
  return launchBase ?? null
}

export function negotiateUraiLocale(input: {
  explicit?: string | null
  stored?: string | null
  languages?: readonly string[]
}): UraiLaunchLocale {
  for (const candidate of [input.explicit, input.stored, ...(input.languages ?? [])]) {
    const locale = normalizeUraiLocale(candidate)
    if (locale) return locale
  }
  return 'en'
}

export function uraiTextDirection(locale: UraiLaunchLocale): UraiTextDirection {
  return URAI_RTL_LOCALES.has(locale) ? 'rtl' : 'ltr'
}

export type UraiMessageSensitivity = 'general' | 'legal' | 'privacy' | 'consent' | 'payment' | 'safety' | 'clinical'

export type UraiMessageDefinition = {
  id: string
  source: string
  sensitivity: UraiMessageSensitivity
  description: string
}

export const URAI_SOURCE_MESSAGES = {
  ...URAI_CORE_MESSAGES,
  'nav.home': { id:'nav.home', source:'Home', sensitivity:'general', description:'Canonical Home navigation label' },
  'nav.lifeMap': { id:'nav.lifeMap', source:'Life Map', sensitivity:'general', description:'Canonical Life Map navigation label' },
  'nav.focus': { id:'nav.focus', source:'Focus', sensitivity:'general', description:'Canonical Focus navigation label' },
  'nav.replay': { id:'nav.replay', source:'Replay', sensitivity:'general', description:'Canonical Replay navigation label' },
  'common.loading': { id:'common.loading', source:'Loading…', sensitivity:'general', description:'Generic bounded loading state' },
  'common.unavailable': { id:'common.unavailable', source:'This experience is temporarily unavailable.', sensitivity:'general', description:'Generic fail-closed unavailable state' },
  'privacy.reviewRequired': { id:'privacy.reviewRequired', source:'Native review required', sensitivity:'privacy', description:'Machine-prepared localization review marker' },
} as const satisfies Record<string,UraiMessageDefinition>

export type UraiMessageId = keyof typeof URAI_SOURCE_MESSAGES
export type UraiCatalog = Partial<Record<UraiMessageId,string>>

// English is the only human-authoritative source catalog. The remaining launch
// catalogs are machine-prepared working translations so native reviewers can
// review a complete string set instead of an empty shell. They are NOT runtime
// eligible until the locale is explicitly added to URAI_NATIVE_REVIEWED_LOCALES.
export const URAI_CATALOGS: Record<UraiLaunchLocale,UraiCatalog> = {
  en: {
    'nav.home': 'Home',
    'nav.lifeMap': 'Life Map',
    'nav.focus': 'Focus',
    'nav.replay': 'Replay',
    'common.loading': 'Loading…',
    'common.unavailable': 'This experience is temporarily unavailable.',
    'privacy.reviewRequired': 'Native review required',
  },
  'zh-Hans': {
    'nav.home': '首页',
    'nav.lifeMap': '生命地图',
    'nav.focus': '聚焦',
    'nav.replay': '回放',
    'common.loading': '加载中…',
    'common.unavailable': '此体验暂时不可用。',
    'privacy.reviewRequired': '需要母语审核',
  },
  hi: {
    'nav.home': 'होम',
    'nav.lifeMap': 'जीवन मानचित्र',
    'nav.focus': 'फोकस',
    'nav.replay': 'रीप्ले',
    'common.loading': 'लोड हो रहा है…',
    'common.unavailable': 'यह अनुभव अस्थायी रूप से उपलब्ध नहीं है।',
    'privacy.reviewRequired': 'मातृभाषी समीक्षा आवश्यक',
  },
  es: {
    'nav.home': 'Inicio',
    'nav.lifeMap': 'Mapa de vida',
    'nav.focus': 'Enfoque',
    'nav.replay': 'Repetición',
    'common.loading': 'Cargando…',
    'common.unavailable': 'Esta experiencia no está disponible temporalmente.',
    'privacy.reviewRequired': 'Se requiere revisión nativa',
  },
  fr: {
    'nav.home': 'Accueil',
    'nav.lifeMap': 'Carte de vie',
    'nav.focus': 'Concentration',
    'nav.replay': 'Relecture',
    'common.loading': 'Chargement…',
    'common.unavailable': 'Cette expérience est temporairement indisponible.',
    'privacy.reviewRequired': 'Révision par un locuteur natif requise',
  },
  ar: {
    'nav.home': 'الرئيسية',
    'nav.lifeMap': 'خريطة الحياة',
    'nav.focus': 'التركيز',
    'nav.replay': 'إعادة التشغيل',
    'common.loading': 'جارٍ التحميل…',
    'common.unavailable': 'هذه التجربة غير متاحة مؤقتًا.',
    'privacy.reviewRequired': 'مراجعة من متحدث أصلي مطلوبة',
  },
  bn: {
    'nav.home': 'হোম',
    'nav.lifeMap': 'জীবন মানচিত্র',
    'nav.focus': 'ফোকাস',
    'nav.replay': 'রিপ্লে',
    'common.loading': 'লোড হচ্ছে…',
    'common.unavailable': 'এই অভিজ্ঞতাটি সাময়িকভাবে অনুপলব্ধ।',
    'privacy.reviewRequired': 'মাতৃভাষী পর্যালোচনা প্রয়োজন',
  },
  'pt-BR': {
    'nav.home': 'Início',
    'nav.lifeMap': 'Mapa da vida',
    'nav.focus': 'Foco',
    'nav.replay': 'Reprodução',
    'common.loading': 'Carregando…',
    'common.unavailable': 'Esta experiência está temporariamente indisponível.',
    'privacy.reviewRequired': 'Revisão por falante nativo necessária',
  },
  ru: {
    'nav.home': 'Главная',
    'nav.lifeMap': 'Карта жизни',
    'nav.focus': 'Фокус',
    'nav.replay': 'Повтор',
    'common.loading': 'Загрузка…',
    'common.unavailable': 'Этот опыт временно недоступен.',
    'privacy.reviewRequired': 'Требуется проверка носителем языка',
  },
  ur: {
    'nav.home': 'ہوم',
    'nav.lifeMap': 'زندگی کا نقشہ',
    'nav.focus': 'فوکس',
    'nav.replay': 'ری پلے',
    'common.loading': 'لوڈ ہو رہا ہے…',
    'common.unavailable': 'یہ تجربہ عارضی طور پر دستیاب نہیں ہے۔',
    'privacy.reviewRequired': 'مقامی زبان کے ماہر کا جائزہ درکار ہے',
  },
  id: {
    'nav.home': 'Beranda',
    'nav.lifeMap': 'Peta Kehidupan',
    'nav.focus': 'Fokus',
    'nav.replay': 'Putar Ulang',
    'common.loading': 'Memuat…',
    'common.unavailable': 'Pengalaman ini sementara tidak tersedia.',
    'privacy.reviewRequired': 'Tinjauan penutur asli diperlukan',
  },
  de: {
    'nav.home': 'Start',
    'nav.lifeMap': 'Lebenskarte',
    'nav.focus': 'Fokus',
    'nav.replay': 'Wiedergabe',
    'common.loading': 'Wird geladen…',
    'common.unavailable': 'Dieses Erlebnis ist vorübergehend nicht verfügbar.',
    'privacy.reviewRequired': 'Prüfung durch Muttersprachler erforderlich',
  },
  ja: {
    'nav.home': 'ホーム',
    'nav.lifeMap': 'ライフマップ',
    'nav.focus': 'フォーカス',
    'nav.replay': 'リプレイ',
    'common.loading': '読み込み中…',
    'common.unavailable': 'この体験は一時的に利用できません。',
    'privacy.reviewRequired': 'ネイティブレビューが必要です',
  },
  sw: {
    'nav.home': 'Mwanzo',
    'nav.lifeMap': 'Ramani ya Maisha',
    'nav.focus': 'Lenga',
    'nav.replay': 'Cheza Tena',
    'common.loading': 'Inapakia…',
    'common.unavailable': 'Hali hii haipatikani kwa muda.',
    'privacy.reviewRequired': 'Mapitio ya mzungumzaji asilia yanahitajika',
  },
  tr: {
    'nav.home': 'Ana Sayfa',
    'nav.lifeMap': 'Yaşam Haritası',
    'nav.focus': 'Odak',
    'nav.replay': 'Tekrar Oynat',
    'common.loading': 'Yükleniyor…',
    'common.unavailable': 'Bu deneyim geçici olarak kullanılamıyor.',
    'privacy.reviewRequired': 'Ana dili konuşan incelemesi gerekli',
  },
  vi: {
    'nav.home': 'Trang chủ',
    'nav.lifeMap': 'Bản đồ Cuộc sống',
    'nav.focus': 'Tập trung',
    'nav.replay': 'Phát lại',
    'common.loading': 'Đang tải…',
    'common.unavailable': 'Trải nghiệm này tạm thời không khả dụng.',
    'privacy.reviewRequired': 'Cần người bản ngữ duyệt',
  },
  fil: {
    'nav.home': 'Home',
    'nav.lifeMap': 'Mapa ng Buhay',
    'nav.focus': 'Pokus',
    'nav.replay': 'I-replay',
    'common.loading': 'Naglo-load…',
    'common.unavailable': 'Pansamantalang hindi available ang karanasang ito.',
    'privacy.reviewRequired': 'Kailangan ang pagsusuri ng katutubong tagapagsalita',
  },
  ko: {
    'nav.home': '홈',
    'nav.lifeMap': '라이프 맵',
    'nav.focus': '포커스',
    'nav.replay': '다시 재생',
    'common.loading': '불러오는 중…',
    'common.unavailable': '이 경험은 일시적으로 사용할 수 없습니다.',
    'privacy.reviewRequired': '원어민 검토가 필요합니다',
  },
  it: {
    'nav.home': 'Home',
    'nav.lifeMap': 'Mappa della vita',
    'nav.focus': 'Focus',
    'nav.replay': 'Riproduci',
    'common.loading': 'Caricamento…',
    'common.unavailable': 'Questa esperienza è temporaneamente non disponibile.',
    'privacy.reviewRequired': 'È necessaria una revisione da parte di un madrelingua',
  },
  fa: {
    'nav.home': 'خانه',
    'nav.lifeMap': 'نقشه زندگی',
    'nav.focus': 'تمرکز',
    'nav.replay': 'بازپخش',
    'common.loading': 'در حال بارگذاری…',
    'common.unavailable': 'این تجربه موقتاً در دسترس نیست.',
    'privacy.reviewRequired': 'بازبینی توسط گویشور بومی الزامی است',
  },
}

for (const locale of URAI_LAUNCH_LOCALES) Object.assign(URAI_CATALOGS[locale], URAI_CORE_CATALOGS[locale])

export function messageFor(locale: UraiLaunchLocale, id: UraiMessageId) {
  const admittedLocale = runtimeUraiLocale(locale)
  return URAI_CATALOGS[admittedLocale][id] ?? URAI_CATALOGS.en[id] ?? URAI_SOURCE_MESSAGES[id].source
}

export function localizationCompleteness(locale: UraiLaunchLocale) {
  const total = Object.keys(URAI_SOURCE_MESSAGES).length
  const translated = Object.keys(URAI_CATALOGS[locale]).length
  return {
    locale,
    translated,
    total,
    complete: translated === total,
    nativeReviewRequired: !URAI_NATIVE_REVIEWED_LOCALES.has(locale),
  }
}

export function runtimeUraiLocale(requested: UraiLaunchLocale): UraiLaunchLocale {
  const status = localizationCompleteness(requested)
  return status.complete && !status.nativeReviewRequired ? requested : 'en'
}

export function formatUraiDate(locale: UraiLaunchLocale, value: Date | number | string, options: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat(locale, options).format(new Date(value))
}

export function formatUraiNumber(locale: UraiLaunchLocale, value: number, options: Intl.NumberFormatOptions = {}) {
  return new Intl.NumberFormat(locale, options).format(value)
}

export function formatUraiList(locale: UraiLaunchLocale, values: string[], options: Intl.ListFormatOptions = {}) {
  return new Intl.ListFormat(locale, options).format(values)
}
