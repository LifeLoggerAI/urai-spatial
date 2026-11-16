'use client'

import { useManualEmotionalWeather } from './ManualEmotionalWeatherProvider'
import { URAI_EMOTIONAL_WEATHER } from './weather'

export function ManualEmotionalWeatherControls() {
  const { snapshot, setEnabled, choose, reset } = useManualEmotionalWeather()
  const weather = snapshot.reading.weather
  return <section className="manual-emotional-weather-controls" lang="en" dir="ltr" aria-labelledby="manual-weather-heading" data-manual-weather-preference="session-only" data-weather-inference="off" style={{margin:'18px 0',border:'1px solid rgba(197,242,247,.16)',borderRadius:28,padding:'clamp(22px,4vw,34px)',background:'rgba(9,20,28,.66)',overflowWrap:'anywhere'}}>
    <h2 id="manual-weather-heading" style={{fontSize:30,margin:'0 0 12px'}}>Emotional Weather</h2>
    <p style={{color:'#c4d1d6',lineHeight:1.6}}>Choose a description to show in Home. This is your own description, not an inference or health assessment. It is off by default.</p>
    <p style={{color:'#c4d1d6',lineHeight:1.6}}>Your choice stays in this app's memory for this session. It is cleared by turning this off, resetting, signing out or changing accounts, closing or reloading this app, or requesting a privacy change or deletion. It is not saved or sent to a server.</p>
    <label style={{display:'flex',gap:12,alignItems:'center',minHeight:48,fontWeight:700}}>
      <input type="checkbox" checked={snapshot.enabled} disabled={!snapshot.ready} onChange={event => setEnabled(event.currentTarget.checked)} style={{width:24,height:24}} />
      <span>Show my manual description in Home</span>
    </label>
    <label style={{display:'grid',gap:8,marginTop:16}}>My description
      <select value={weather ?? ''} disabled={!snapshot.ready || !snapshot.enabled} onChange={event => choose(event.currentTarget.value)} style={{boxSizing:'border-box',minHeight:48,width:'100%',maxWidth:420,padding:12,border:'1px solid #8fb4bd',borderRadius:12,background:'#071018',color:'#f4f8fb',fontSize:16}}>
        <option value="">Choose a description</option>
        {URAI_EMOTIONAL_WEATHER.map(choice => <option key={choice} value={choice}>{choice}</option>)}
      </select>
    </label>
    <button type="button" disabled={!snapshot.ready || !snapshot.enabled} onClick={() => reset()} style={{minHeight:48,minWidth:48,marginTop:16,padding:'10px 18px',border:'1px solid #8fb4bd',borderRadius:12,background:'#071018',color:'#f4f8fb',fontSize:16}}>Reset and turn off</button>
    <p role="status" aria-live="polite" style={{color:'#c4d1d6',lineHeight:1.6}}>{!snapshot.ready ? 'Session authority is unavailable. Emotional Weather remains off.' : !snapshot.enabled ? 'Emotional Weather is off.' : weather ? `${weather} — your choice for this session.` : 'Choose a description. Home will show no reading until you choose.'}</p>
    <style jsx>{`.manual-emotional-weather-controls :is(input,select,button):focus-visible{outline:2px solid #f3fbf8;outline-offset:3px}`}</style>
  </section>
}

export function HomeManualEmotionalWeatherStatus() {
  const { snapshot } = useManualEmotionalWeather()
  const { weather, source } = snapshot.reading
  if (!snapshot.ready || !snapshot.enabled || !weather || source !== 'manual') return null
  return <aside lang="en" dir="ltr" role="status" aria-live="polite" data-home-emotional-weather="manual" data-weather-inference="off" style={{position:'fixed',left:'max(12px,env(safe-area-inset-left))',bottom:'max(12px,env(safe-area-inset-bottom))',zIndex:30,boxSizing:'border-box',maxWidth:'min(360px,calc(100vw - 24px))',padding:'12px 16px',borderRadius:16,background:'rgba(6,18,19,.94)',color:'#f3fbf8',font:'14px/1.5 system-ui',overflowWrap:'anywhere'}}>
    <strong>Manual Emotional Weather: {weather}</strong>
    <p style={{margin:'4px 0'}}>Your description for this session.</p>
    <a href="/settings" style={{display:'inline-flex',alignItems:'center',minWidth:48,minHeight:48,color:'#c9eef3'}}>Change or turn off</a>
  </aside>
}
