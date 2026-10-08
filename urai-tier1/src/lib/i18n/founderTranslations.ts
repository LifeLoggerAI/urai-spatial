import type { UraiLaunchLocale } from './locales'

// Machine-prepared review material only. Privacy-sensitive disclosure continues
// to use the reviewed runtime locale; these rows grant no language acceptance.
export const URAI_FOUNDER_TRANSLATIONS = {
  'zh-Hans': {'founder.disclosure': '创始人的数字化呈现'},
  hi: {'founder.disclosure': 'संस्थापक की डिजिटल उपस्थिति'},
  es: {'founder.disclosure': 'Presencia digital del fundador'},
  fr: {'founder.disclosure': 'Présence numérique du fondateur'},
  ar: {'founder.disclosure': 'الحضور الرقمي للمؤسس'},
  bn: {'founder.disclosure': 'প্রতিষ্ঠাতার ডিজিটাল উপস্থিতি'},
  'pt-BR': {'founder.disclosure': 'Presença digital do fundador'},
  ru: {'founder.disclosure': 'Цифровое присутствие основателя'},
  ur: {'founder.disclosure': 'بانی کی ڈیجیٹل موجودگی'},
  id: {'founder.disclosure': 'Kehadiran digital pendiri'},
  de: {'founder.disclosure': 'Digitale Präsenz des Gründers'},
  ja: {'founder.disclosure': '創業者のデジタルプレゼンス'},
  sw: {'founder.disclosure': 'Uwepo wa kidijitali wa mwanzilishi'},
  tr: {'founder.disclosure': 'Kurucunun dijital varlığı'},
  vi: {'founder.disclosure': 'Sự hiện diện kỹ thuật số của nhà sáng lập'},
  fil: {'founder.disclosure': 'Digital na presensya ng tagapagtatag'},
  ko: {'founder.disclosure': '창업자의 디지털 존재감'},
  it: {'founder.disclosure': 'Presenza digitale del fondatore'},
  fa: {'founder.disclosure': 'حضور دیجیتال بنیان‌گذار'},
} as const satisfies Record<Exclude<UraiLaunchLocale, 'en'>, {'founder.disclosure': string}>
