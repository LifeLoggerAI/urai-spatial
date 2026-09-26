'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { getAuth, onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth'
import { app, firebasePublicEnvReady } from '@/lib/firebase/client'
import {
  buildAuthProvider,
  configuredAuthProviders,
  type UraiAuthProviderId,
} from '@/auth/uraiAuthProviders'

type AuthState = 'checking' | 'signed-out' | 'working' | 'signed-in' | 'unavailable' | 'error'
type AuthIntent = 'login' | 'signup'

function safeReturnPath(raw: string | null) {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/home'
  try {
    const url = new URL(raw, 'https://urai.app')
    if (url.origin !== 'https://urai.app') return '/home'
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return '/home'
  }
}

export default function LoginClient({ intent = 'login' }: { intent?: AuthIntent }) {
  const providers = useMemo(() => configuredAuthProviders(), [])
  const [resolvedIntent, setResolvedIntent] = useState<AuthIntent>(intent)
  const creating = resolvedIntent === 'signup'
  const [continuePath, setContinuePath] = useState('/home')
  const [workingProvider, setWorkingProvider] = useState<UraiAuthProviderId | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [state, setState] = useState<AuthState>(firebasePublicEnvReady ? 'checking' : 'unavailable')
  const [message, setMessage] = useState(
    firebasePublicEnvReady
      ? creating ? 'Checking account creation availability...' : 'Checking account state...'
      : 'Private account access is unavailable because Firebase public configuration is not present.'
  )

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    setResolvedIntent(params.get('from') === 'signup' ? 'signup' : intent)
    setContinuePath(safeReturnPath(params.get('returnTo')))
  }, [intent])

  useEffect(() => {
    if (!firebasePublicEnvReady) return
    const auth = getAuth(app)
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser)
      setWorkingProvider(null)
      setState(nextUser ? 'signed-in' : 'signed-out')
      setMessage(nextUser
        ? 'Your private world is ready.'
        : creating
          ? 'Choose a configured identity provider. A first-time provider identity can create your private UrAi account without sharing the provider password.'
          : 'Choose a configured identity provider. UrAi never receives the provider password.')
    }, () => {
      setWorkingProvider(null)
      setState('error')
      setMessage('Account authority could not be read. No private state has been opened.')
    })
  }, [creating])

  const enter = async (providerId: UraiAuthProviderId) => {
    if (!firebasePublicEnvReady || state === 'working') return
    setState('working')
    setWorkingProvider(providerId)
    setMessage(creating ? 'Opening the secure identity provider to create your private account...' : 'Opening the secure identity provider...')
    try {
      const result = await signInWithPopup(getAuth(app), buildAuthProvider(providerId))
      setUser(result.user)
      setState('signed-in')
      setMessage('Your private world is ready.')
    } catch {
      setState('signed-out')
      setMessage(creating ? 'Account creation was not completed. No private account state was opened.' : 'Sign-in was not completed. Your private world remains closed.')
    } finally {
      setWorkingProvider(null)
    }
  }

  const leave = async () => {
    if (!firebasePublicEnvReady || state === 'working') return
    setState('working')
    setMessage('Closing this private session...')
    try {
      await signOut(getAuth(app))
      setUser(null)
      setState('signed-out')
      setMessage('Signed out. This browser no longer has an active UrAi session.')
    } catch {
      setState('error')
      setMessage('Sign-out could not be confirmed. Refresh before assuming the private session is closed.')
    }
  }

  return (
    <main data-route-owner={creating ? 'canonical-auth-signup' : 'canonical-auth-entry'} style={{minHeight:'100svh',display:'grid',placeItems:'center',padding:'max(28px,env(safe-area-inset-top)) 20px max(34px,env(safe-area-inset-bottom))',background:'radial-gradient(circle at 50% 24%,#15303a 0,#071119 38%,#020609 78%)',color:'#f6fafc',fontFamily:'var(--font-sans)'}}>
      <section style={{width:'min(560px,100%)',padding:'clamp(26px,6vw,46px)',border:'1px solid rgba(188,239,246,.15)',borderRadius:32,background:'rgba(5,14,20,.72)',boxShadow:'0 30px 100px rgba(0,0,0,.42)',backdropFilter:'blur(22px)'}}>
        <Link href="/home" style={tertiary}>← Home</Link>
        <p style={{margin:'44px 0 0',fontSize:11,letterSpacing:'.22em',textTransform:'uppercase',color:'#88aeb7'}}>{creating ? 'Private beginning' : 'Private threshold'}</p>
        <h1 style={{margin:'10px 0 12px',fontSize:'clamp(42px,9vw,66px)',lineHeight:.94,letterSpacing:'-.055em'}}>{creating ? 'Create your world.' : 'Enter your world.'}</h1>
        <p role="status" aria-live="polite" style={{minHeight:48,color:'#b8c9cf',lineHeight:1.55}}>{message}</p>

        {state === 'signed-in' && user ? (
          <div>
            <p style={{color:'#d9f5f8'}}>Signed in as <strong>{user.email ?? 'your private account'}</strong>.</p>
            <div style={{display:'flex',gap:10,flexWrap:'wrap',marginTop:24}}>
              <Link href={continuePath} style={primary}>Continue</Link>
              <Link href="/settings#connected-data" style={secondary}>Connected accounts</Link>
              <Link href="/passport" style={secondary}>Passport</Link>
              <button type="button" onClick={() => void leave()} style={buttonSecondary}>Sign out</button>
            </div>
          </div>
        ) : (
          <div style={{marginTop:24,display:'grid',gap:12}}>
            {providers.map((provider) => (
              <div key={provider.id}>
                <button
                  type="button"
                  disabled={state === 'unavailable' || state === 'working'}
                  onClick={() => void enter(provider.id)}
                  style={{...buttonPrimary,width:'100%'}}
                >
                  {workingProvider === provider.id ? 'Opening provider...' : provider.label}
                </button>
                <p style={{margin:'7px 4px 0',fontSize:12,lineHeight:1.45,color:'#7897a0'}}>{provider.note}</p>
              </div>
            ))}
            {providers.length === 0 ? (
              <p role="alert" style={{margin:0,color:'#d8b9a7',lineHeight:1.55}}>No identity provider is configured for this build. Private account access remains closed.</p>
            ) : null}
          </div>
        )}

        <p style={{margin:'26px 0 0',fontSize:13,lineHeight:1.55,color:'#98b2b9'}}>
          {creating ? <>Already have a private world? <Link href="/login" style={inlineAction}>Sign in</Link>.</> : <>New to UrAi? <Link href="/signup" style={inlineAction}>Create your private world</Link>.</>}
        </p>
        <p style={{margin:'18px 0 0',fontSize:12,lineHeight:1.55,color:'#7897a0'}}>
          Signing in proves account identity only. It does not connect or import email, social posts, photos, videos, messages, contacts, files, calendar history, or other prior context. Those connections require separate permission after sign-in.
        </p>
        <p style={{margin:'12px 0 0',fontSize:12,lineHeight:1.55,color:'#7897a0'}}>
          UrAi does not collect provider passwords or create demo identity. Private routes remain fail-closed when account authority is unavailable.
        </p>
      </section>
    </main>
  )
}

const primary = {display:'inline-flex',alignItems:'center',justifyContent:'center',minHeight:48,padding:'11px 16px',borderRadius:999,background:'#e9fbfd',color:'#071116',fontWeight:800,textDecoration:'none'} as const
const secondary = {display:'inline-flex',alignItems:'center',justifyContent:'center',minHeight:48,padding:'11px 16px',borderRadius:999,border:'1px solid rgba(255,255,255,.17)',color:'#edf7f9',fontWeight:700,textDecoration:'none'} as const
const tertiary = {display:'inline-flex',alignItems:'center',justifyContent:'center',minWidth:48,minHeight:48,color:'#a9dce4',textDecoration:'none'} as const
const inlineAction = {display:'inline-flex',alignItems:'center',justifyContent:'center',minWidth:48,minHeight:48,color:'#bceff5',textDecoration:'underline',textUnderlineOffset:3} as const
const buttonPrimary = {...primary,border:0,cursor:'pointer'} as const
const buttonSecondary = {...secondary,background:'transparent',cursor:'pointer'} as const
