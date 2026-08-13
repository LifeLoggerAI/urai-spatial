'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { setHapticsEnabled, URAI_HAPTICS_STORAGE_KEY } from '@/spatial/haptics/HapticRuntime'

function readHapticsPreference() {
  if (typeof window === 'undefined') return true
  try {
    return window.localStorage.getItem(URAI_HAPTICS_STORAGE_KEY) !== 'false'
  } catch {
    return true
  }
}

export default function DeviceSettingsClient() {
  const [haptics, setHaptics] = useState(true)
  const [supportsVibration, setSupportsVibration] = useState(false)
  const [supportsGamepad, setSupportsGamepad] = useState(false)

  useEffect(() => {
    setHaptics(readHapticsPreference())
    setSupportsVibration(typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function')
    setSupportsGamepad(typeof navigator !== 'undefined' && typeof navigator.getGamepads === 'function')
  }, [])

  const updateHaptics = (enabled: boolean) => {
    setHaptics(enabled)
    setHapticsEnabled(enabled)
  }

  return (
    <main style={{minHeight:'100svh',background:'radial-gradient(circle at 50% 0%,#10202a 0,#071018 42%,#02060a 100%)',color:'#f4f8fb',padding:'max(28px,env(safe-area-inset-top)) clamp(18px,5vw,72px) max(44px,env(safe-area-inset-bottom))',fontFamily:'var(--font-sans)'}} data-route-owner="device-settings">
      <div style={{maxWidth:860,margin:'0 auto'}}>
        <nav aria-label="Settings navigation" style={{display:'flex',justifyContent:'space-between',gap:16,alignItems:'center'}}><Link href="/home" style={{color:'#c9eef3',textDecoration:'none'}}>← Home</Link><Link href="/passport" style={{color:'#c9eef3',textDecoration:'none'}}>Passport</Link></nav>
        <header style={{padding:'clamp(42px,8vw,92px) 0 34px'}}><p style={{letterSpacing:'.22em',textTransform:'uppercase',fontSize:11,color:'#8fb4bd'}}>Device feel</p><h1 style={{fontSize:'clamp(42px,8vw,78px)',lineHeight:.94,letterSpacing:'-.055em',margin:'10px 0 18px'}}>How URAI meets you.</h1><p style={{maxWidth:620,fontSize:'clamp(16px,2vw,20px)',lineHeight:1.6,color:'#c4d1d6'}}>Local sensory preferences live on this device. Private data permissions remain in the Consent Sanctuary, and ownership controls remain in Passport.</p></header>

        <section aria-labelledby="haptics-heading" style={{border:'1px solid rgba(197,242,247,.16)',borderRadius:28,padding:'clamp(22px,4vw,34px)',background:'rgba(9,20,28,.66)',backdropFilter:'blur(18px)'}}>
          <div style={{display:'flex',justifyContent:'space-between',gap:24,alignItems:'start',flexWrap:'wrap'}}><div><p style={{margin:0,fontSize:11,letterSpacing:'.18em',textTransform:'uppercase',color:'#87aab3'}}>Tactile language</p><h2 id="haptics-heading" style={{fontSize:30,margin:'8px 0'}}>Haptics</h2><p style={{maxWidth:560,margin:0,color:'#b8c8ce',lineHeight:1.55}}>Allow URAI to use short local vibration or compatible controller pulses for portals, return paths and governed interaction cues. No haptic event is sent to a server.</p></div><label style={{display:'inline-flex',gap:12,alignItems:'center',fontWeight:700}}><input type="checkbox" checked={haptics} onChange={(event)=>updateHaptics(event.currentTarget.checked)} style={{width:24,height:24}}/><span>{haptics?'On':'Off'}</span></label></div>
          <p role="status" style={{margin:'22px 0 0',fontSize:13,color:'#8fb4bd'}}>{supportsVibration || supportsGamepad ? 'This browser exposes a compatible local haptic path. Physical feel still depends on the connected hardware.' : 'No compatible local haptic actuator is exposed by this browser. URAI will remain silent without treating that as an error.'}</p>
        </section>

        <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(250px,1fr))',gap:16,marginTop:18}}>
          <Link href="/privacy-controls" style={{padding:24,borderRadius:24,border:'1px solid rgba(255,255,255,.11)',background:'rgba(255,255,255,.035)',color:'inherit',textDecoration:'none'}}><small style={{color:'#8fb4bd'}}>Permissions & consent</small><h2 style={{margin:'8px 0 6px'}}>Consent Sanctuary</h2><p style={{margin:0,color:'#b8c8ce',lineHeight:1.5}}>Review, narrow, pause or revoke private data permissions.</p></Link>
          <Link href="/passport" style={{padding:24,borderRadius:24,border:'1px solid rgba(255,255,255,.11)',background:'rgba(255,255,255,.035)',color:'inherit',textDecoration:'none'}}><small style={{color:'#8fb4bd'}}>Ownership</small><h2 style={{margin:'8px 0 6px'}}>Passport</h2><p style={{margin:0,color:'#b8c8ce',lineHeight:1.5}}>Inspect identity, ownership, export and account boundaries.</p></Link>
          <Link href="/login" style={{padding:24,borderRadius:24,border:'1px solid rgba(255,255,255,.11)',background:'rgba(255,255,255,.035)',color:'inherit',textDecoration:'none'}}><small style={{color:'#8fb4bd'}}>Account</small><h2 style={{margin:'8px 0 6px'}}>Sign in</h2><p style={{margin:0,color:'#b8c8ce',lineHeight:1.5}}>Enter the private world with your Firebase-backed account.</p></Link>
        </section>
      </div>
    </main>
  )
}
