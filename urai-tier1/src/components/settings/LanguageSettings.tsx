'use client'

import { URAI_LAUNCH_LOCALES, runtimeUraiLocale, type UraiLaunchLocale } from '@/lib/i18n/locales'
import { useUraiLocale } from '@/lib/i18n/useUraiLocale'

const names: Record<UraiLaunchLocale,string> = {
  en:'English', 'zh-Hans':'简体中文', hi:'हिन्दी', es:'Español', fr:'Français', ar:'العربية', bn:'বাংলা', 'pt-BR':'Português (Brasil)', ru:'Русский', ur:'اردو',
  id:'Bahasa Indonesia', de:'Deutsch', ja:'日本語', sw:'Kiswahili', tr:'Türkçe', vi:'Tiếng Việt', fil:'Filipino', ko:'한국어', it:'Italiano', fa:'فارسی',
}

export default function LanguageSettings() {
  const locale = useUraiLocale()
  const reviewRequired = runtimeUraiLocale(locale.preference.requested) !== locale.preference.requested
  return <section aria-labelledby="language-heading" data-testid="language-settings" style={{marginBottom:18,border:'1px solid rgba(197,242,247,.16)',borderRadius:28,padding:'clamp(22px,4vw,34px)',background:'rgba(9,20,28,.66)'}}>
    <h2 id="language-heading" {...locale.props('settings.language')}>{locale.text('settings.language')}</h2>
    <label htmlFor="urai-language" {...locale.props('settings.language')}>{locale.text('settings.language')}</label>{' '}
    <select id="urai-language" value={locale.preference.requested} onChange={event => locale.choose(event.currentTarget.value as UraiLaunchLocale)} aria-describedby="language-review-status" style={{maxWidth:'100%',minHeight:48,padding:10,borderRadius:12,color:'#f4f8fb',background:'#0b202b',border:'1px solid #8fb4bd'}}>
      {URAI_LAUNCH_LOCALES.map(code => <option key={code} value={code} lang={code}>{names[code]}</option>)}
    </select>
    <p id="language-review-status" role="status" lang="en" dir="ltr">{reviewRequired ? 'Working translation. Native language review is pending. Consent, privacy, payment, and safety text retain their reviewed fallback.' : 'English source language. Other languages are available as working translation previews.'}</p>
    {reviewRequired ? <label style={{display:'flex',alignItems:'center',gap:12,minHeight:48}}><input type="checkbox" data-testid="locale-preview-toggle" checked={locale.preference.preview} onChange={event => locale.preview(event.currentTarget.checked)} /><span {...locale.props('locale.preview')}>{locale.text('locale.preview')}</span></label> : null}
  </section>
}
