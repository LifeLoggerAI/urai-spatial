'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getAuth, onAuthStateChanged, type User } from 'firebase/auth'
import { app, firebasePublicEnvReady } from '@/lib/firebase/client'
import { setHapticsEnabled, URAI_HAPTICS_STORAGE_KEY } from '@/spatial/haptics/HapticRuntime'

function readHapticsPreference() {
  if (typeof window === 'undefined') return true
  try {
    return window.localStorage.getItem(URAI_HAPTICS_STORAGE_KEY) !== 'false'
  } catch {
    return true
  }
}

type GoogleConnection = {
  connected: boolean
  status: string
  scopes: string[]
  expiresAt: number | null
}

type GoogleUiState = 'checking' | 'signed-out' | 'ready' | 'working' | 'error'

async function googleRequest<T>(path: string, user: User): Promise<T> {
  const token = await user.getIdToken()
  const response = await fetch(path, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: '{}',
    cache: 'no-store',
  })
  const payload = await response.json().catch(() => ({})) as T & { message?: string; error?: string }
  if (!response.ok) throw new Error(payload.message || payload.error || 'Google Workspace request failed.')
  return payload
}

export default function DeviceSettingsClient() {
  const [haptics, setHaptics] = useState(true)
  const [supportsVibration, setSupportsVibration] = useState(false)
  const [supportsGamepad, setSupportsGamepad] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [googleState, setGoogleState] = useState<GoogleUiState>(firebasePublicEnvReady ? 'checking' : 'signed-out')
  const [googleConnection, setGoogleConnection] = useState<GoogleConnection | null>(null)
  const [googleMessage, setGoogleMessage] = useState('Sign in to connect Gmail, Calendar, Contacts, and Drive.')

  useEffect(() => {
    setHaptics(readHapticsPreference())
    setSupportsVibration(typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function')
    setSupportsGamepad(typeof navigator !== 'undefined' && typeof navigator.getGamepads === 'function')
  }, [])

  useEffect(() => {
    if (!firebasePublicEnvReady) return
    const auth = getAuth(app)
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser)
      if (!nextUser) {
        setGoogleConnection(null)
        setGoogleState('signed-out')
        setGoogleMessage('Sign in to connect Gmail, Calendar, Contacts, and Drive.')
        return
      }
      setGoogleState('checking')
      void googleRequest<GoogleConnection>('/api/google/oauth/status', nextUser)
        .then((status) => {
          setGoogleConnection(status)
          setGoogleState('ready')
          setGoogleMessage(status.connected
            ? 'Google Workspace is connected. You can revoke this connection at any time.'
            : 'Connect only the Google services you choose to use with URAI.')
        })
        .catch(() => {
          setGoogleState('error')
          setGoogleMessage('Google Workspace connection status is temporarily unavailable.')
        })
    })
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const result = new URLSearchParams(window.location.search).get('google')
    if (!result) return
    if (result === 'connected') setGoogleMessage('Google Workspace connected successfully.')
    else if (result === 'denied') setGoogleMessage('Google connection was not approved. Nothing was connected.')
    else if (result === 'invalid-state') setGoogleMessage('Google connection expired before completion. Try connecting again.')
    else if (result === 'error') setGoogleMessage('Google could not complete the connection. Try again when ready.')
  }, [])

  const updateHaptics = (enabled: boolean) => {
    setHaptics(enabled)
    setHapticsEnabled(enabled)
  }

  const connectGoogle = async () => {
    if (!user || googleState === 'working') return
    setGoogleState('working')
    setGoogleMessage('Opening Google permission controls...')
    try {
      const result = await googleRequest<{ authorizationUrl: string }>('/api/google/oauth/start', user)
      if (!result.authorizationUrl.startsWith('https://accounts.google.com/')) throw new Error('Unexpected Google authorization URL.')
      window.location.assign(result.authorizationUrl)
    } catch {
      setGoogleState('error')
      setGoogleMessage('Google Workspace connection could not start. Your account remains unchanged.')
    }
  }

  const disconnectGoogle = async () => {
    if (!user || googleState === 'working') return
    setGoogleState('working')
    setGoogleMessage('Revoking the Google Workspace connection...')
    try {
      await googleRequest<{ connected: false }>('/api/google/oauth/disconnect', user)
      setGoogleConnection({ connected: false, status: 'disconnected', scopes: [], expiresAt: null })
      setGoogleState('ready')
      setGoogleMessage('Google Workspace is disconnected from URAI.')
    } catch {
      setGoogleState('error')
      setGoogleMessage('URAI could not confirm the disconnect. Try again before assuming access was revoked.')
    }
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

        <section aria-labelledby="google-workspace-heading" style={{marginTop:18,border:'1px solid rgba(197,242,247,.16)',borderRadius:28,padding:'clamp(22px,4vw,34px)',background:'rgba(9,20,28,.66)',backdropFilter:'blur(18px)'}}>
          <div style={{display:'flex',justifyContent:'space-between',gap:24,alignItems:'start',flexWrap:'wrap'}}>
            <div style={{maxWidth:590}}><p style={{margin:0,fontSize:11,letterSpacing:'.18em',textTransform:'uppercase',color:'#87aab3'}}>Connected data</p><h2 id="google-workspace-heading" style={{fontSize:30,margin:'8px 0'}}>Google Workspace</h2><p style={{margin:0,color:'#b8c8ce',lineHeight:1.55}}>Connect Gmail read access, Calendar events, Contacts, and user-selected Drive files through Google’s permission screen. The connection is optional and revocable.</p></div>
            {user ? (
              googleConnection?.connected ? <button type="button" disabled={googleState==='working'} onClick={() => void disconnectGoogle()} style={{padding:'11px 16px',borderRadius:999,border:'1px solid rgba(255,255,255,.17)',background:'transparent',color:'#edf7f9',fontWeight:700,cursor:'pointer'}}>Disconnect</button>
                : <button type="button" disabled={googleState==='working'||googleState==='checking'} onClick={() => void connectGoogle()} style={{padding:'11px 16px',borderRadius:999,border:0,background:'#e9fbfd',color:'#071116',fontWeight:800,cursor:'pointer'}}>Connect Google</button>
            ) : <Link href="/login" style={{padding:'11px 16px',borderRadius:999,background:'#e9fbfd',color:'#071116',fontWeight:800,textDecoration:'none'}}>Sign in first</Link>}
          </div>
          <p role="status" aria-live="polite" style={{margin:'22px 0 0',fontSize:13,color:'#8fb4bd'}}>{googleMessage}</p>
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
