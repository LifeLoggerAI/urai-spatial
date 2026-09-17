'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth'
import { app, firebasePublicEnvReady } from '@/lib/firebase/client'

type AuthState = 'checking' | 'signed-out' | 'working' | 'signed-in' | 'unavailable' | 'error'
type AuthIntent = 'login' | 'signup'

export default function LoginClient({ intent = 'login' }: { intent?: AuthIntent }) {
  const creating = intent === 'signup'
  const [user, setUser] = useState<User | null>(null)
  const [state, setState] = useState<AuthState>(firebasePublicEnvReady ? 'checking' : 'unavailable')
  const [message, setMessage] = useState(
    firebasePublicEnvReady
      ? creating ? 'Checking account creation availability...' : 'Checking account state...'
      : 'Private account access is unavailable because Firebase public configuration is not present.'
  )

  useEffect(() => {
    if (!firebasePublicEnvReady) return
    const auth = getAuth(app)
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser)
      setState(nextUser ? 'signed-in' : 'signed-out')
      setMessage(nextUser
        ? 'Your private world is ready.'
        : creating
          ? 'Continue through the configured Firebase identity provider. A first-time provider identity creates your private URAI account without sharing the provider password.'
          : 'Continue through the configured Firebase identity provider. URAI never receives your provider password.')
    }, () => {
      setState('error')
      setMessage('Account authority could not be read. No private state has been opened.')
    })
  }, [creating])

  const enter = async () => {
    if (!firebasePublicEnvReady) return
    setState('working')
    setMessage(creating ? 'Opening the secure identity provider to create your private account...' : 'Opening the secure identity provider...')
    try {
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })
      await signInWithPopup(getAuth(app), provider)
    } catch {
      setState('signed-out')
      setMessage(creating ? 'Account creation was not completed. No private account state was opened.' : 'Sign-in was not completed. Your private world remains closed.')
    }
  }

  const leave = async () => {
    try { await signOut(getAuth(app)) } catch { setMessage('Sign-out could not be confirmed. Refresh before assuming the private session is closed.') }
  }

  return (
    <main data-route-owner={creating ? 'canonical-auth-signup' : 'canonical-auth-entry'} style={{minHeight:'100svh',display:'grid',placeItems:'center',padding:'max(28px,env(safe-area-inset-top)) 20px max(34px,env(safe-area-inset-bottom))',background:'radial-gradient(circle at 50% 24%,#15303a 0,#071119 38%,#020609 78%)',color:'#f6fafc',fontFamily:'var(--font-sans)'}}>
      <section style={{width:'min(520px,100%)',padding:'clamp(26px,6vw,46px)',border:'1px solid rgba(188,239,246,.15)',borderRadius:32,background:'rgba(5,14,20,.72)',boxShadow:'0 30px 100px rgba(0,0,0,.42)',backdropFilter:'blur(22px)'}}>
        <Link href="/home" style={{color:'#a9dce4',textDecoration:'none'}}>← Home</Link>
        <p style={{margin:'44px 0 0',fontSize:11,letterSpacing:'.22em',textTransform:'uppercase',color:'#88aeb7'}}>{creating ? 'Private beginning' : 'Private threshold'}</p>
        <h1 style={{margin:'10px 0 12px',fontSize:'clamp(42px,9vw,66px)',lineHeight:.94,letterSpacing:'-.055em'}}>{creating ? 'Create your world.' : 'Enter your world.'}</h1>
        <p role="status" aria-live="polite" style={{minHeight:48,color:'#b8c9cf',lineHeight:1.55}}>{message}</p>

        {state === 'signed-in' && user ? (
          <div>
            <p style={{color:'#d9f5f8'}}>Signed in as <strong>{user.email ?? 'your private account'}</strong>.</p>
            <div style={{display:'flex',gap:10,flexWrap:'wrap',marginTop:24}}><Link href="/home" style={primary}>Open Home</Link><Link href="/passport" style={secondary}>Passport</Link><button type="button" onClick={() => void leave()} style={buttonSecondary}>Sign out</button></div>
          </div>
        ) : (
          <div style={{marginTop:24}}><button type="button" disabled={state==='unavailable'||state==='working'} onClick={() => void enter()} style={buttonPrimary}>{state==='working'?'Opening provider...':creating?'Create securely':'Continue securely'}</button></div>
        )}

        <p style={{margin:'26px 0 0',fontSize:13,lineHeight:1.55,color:'#98b2b9'}}>
          {creating ? <>Already have a private world? <Link href="/login" style={{color:'#bceff5'}}>Sign in</Link>.</> : <>New to URAI? <Link href="/signup" style={{color:'#bceff5'}}>Create your private world</Link>.</>}
        </p>
        <p style={{margin:'22px 0 0',fontSize:12,lineHeight:1.55,color:'#7897a0'}}>{creating ? 'Identity verification and first-time account registration happen with the configured Firebase provider. URAI does not collect the provider password or create demo identity. Private routes remain fail-closed when account authority is unavailable.' : 'Identity verification happens with the configured Firebase provider. URAI does not collect the provider password or create demo identity. Private routes remain fail-closed when account authority is unavailable.'}</p>
      </section>
    </main>
  )
}

const primary = {display:'inline-flex',alignItems:'center',justifyContent:'center',padding:'11px 16px',borderRadius:999,background:'#e9fbfd',color:'#071116',fontWeight:800,textDecoration:'none'} as const
const secondary = {display:'inline-flex',alignItems:'center',justifyContent:'center',padding:'11px 16px',borderRadius:999,border:'1px solid rgba(255,255,255,.17)',color:'#edf7f9',fontWeight:700,textDecoration:'none'} as const
const buttonPrimary = {...primary,border:0,cursor:'pointer'} as const
const buttonSecondary = {...secondary,background:'transparent',cursor:'pointer'} as const
