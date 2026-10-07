'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getAuth, GoogleAuthProvider, OAuthProvider, onAuthStateChanged, signInWithCredential, signInWithPopup, signOut, type User } from 'firebase/auth'
import { Capacitor } from '@capacitor/core'
import { app, firebasePublicEnvReady } from '@/lib/firebase/client'
import { NativeGoogleSignInUnavailable, performUraiGoogleSignIn, performUraiGoogleSignOut, performUraiAppleSignIn } from '@/lib/firebase/googleSignInPolicy'

type AuthState = 'checking' | 'signed-out' | 'working' | 'signed-in' | 'unavailable' | 'error'

export default function LoginClient() {
  const [user, setUser] = useState<User | null>(null)
  const [nativeIos, setNativeIos] = useState(false)
  const [state, setState] = useState<AuthState>(firebasePublicEnvReady ? 'checking' : 'unavailable')
  const [message, setMessage] = useState(firebasePublicEnvReady ? 'Checking account state...' : 'Private sign-in is unavailable because Firebase public configuration is not present.')

  useEffect(() => {
    setNativeIos(Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios')
    if (!firebasePublicEnvReady) return
    const auth = getAuth(app)
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser)
      if (!nextUser && Capacitor.isNativePlatform() && !nativeIdentityConfigured()) {
        setState('unavailable')
        setMessage(new NativeGoogleSignInUnavailable().message)
        return
      }
      setState(nextUser ? 'signed-in' : 'signed-out')
      setMessage(nextUser ? 'Your private world is ready.' : 'Continue through the configured Firebase identity provider. URAI never receives your provider password.')
    }, () => {
      setState('error')
      setMessage('Account authority could not be read. No private state has been opened.')
    })
  }, [])

  const enter = async () => {
    if (!firebasePublicEnvReady) return
    setState('working')
    setMessage('Opening the secure identity provider...')
    try {
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })
      await performUraiGoogleSignIn({
        native: Capacitor.isNativePlatform(),
        platform: Capacitor.getPlatform(),
        nativeConfigured: nativeGoogleConfigured(),
      }, {
        web: () => signInWithPopup(getAuth(app), provider),
        native: async () => {
          const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication')
          const result = await FirebaseAuthentication.signInWithGoogle({ skipNativeAuth: true, ...(Capacitor.getPlatform() === 'android' ? { useCredentialManager: true } : {}) })
          return result.credential?.idToken
        },
        exchange: (idToken) => signInWithCredential(getAuth(app), GoogleAuthProvider.credential(idToken)),
      })
    } catch (error) {
      setState(error instanceof NativeGoogleSignInUnavailable ? 'unavailable' : 'signed-out')
      setMessage(error instanceof NativeGoogleSignInUnavailable ? error.message : 'Sign-in was not completed. Your private world remains closed.')
    }
  }

  const enterApple = async () => {
    if (!firebasePublicEnvReady || state === 'working') return
    setState('working')
    setMessage('Opening secure Apple sign-in...')
    try {
      await performUraiAppleSignIn({ native: Capacitor.isNativePlatform(), platform: Capacitor.getPlatform(), nativeConfigured: nativeAppleConfigured() }, {
        native: async () => {
          const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication')
          const result = await FirebaseAuthentication.signInWithApple({ skipNativeAuth: true })
          return { idToken: result.credential?.idToken, nonce: result.credential?.nonce }
        },
        exchange: (idToken, rawNonce) => signInWithCredential(getAuth(app), new OAuthProvider('apple.com').credential({ idToken, rawNonce })),
      })
    } catch (error) {
      setState(error instanceof NativeGoogleSignInUnavailable ? 'unavailable' : 'signed-out')
      setMessage(error instanceof NativeGoogleSignInUnavailable ? error.message : 'Sign-in was not completed. Your private world remains closed.')
    }
  }

  const leave = async () => {
    try {
      const accountReset = await performUraiGoogleSignOut({
        native: Capacitor.isNativePlatform(),
        platform: Capacitor.getPlatform(),
        nativeConfigured: nativeIdentityConfigured(),
      }, {
        closeSession: () => signOut(getAuth(app)),
        resetNativeAccount: async () => {
          const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication')
          await FirebaseAuthentication.signOut()
        },
      })
      if (!accountReset) setMessage('Your private session is closed. Choose your account again the next time you sign in.')
    } catch { setMessage('Sign-out could not be confirmed. Refresh before assuming the private session is closed.') }
  }

  return (
    <main data-route-owner="canonical-auth-entry" style={{boxSizing:'border-box',overflowWrap:'anywhere',height:'100svh',minHeight:'100svh',overflowX:'hidden',overflowY:'auto',overscrollBehaviorY:'contain',display:'grid',justifyItems:'center',alignItems:'safe center',padding:'max(28px,env(safe-area-inset-top)) max(20px,env(safe-area-inset-right)) max(34px,env(safe-area-inset-bottom)) max(20px,env(safe-area-inset-left))',background:'radial-gradient(circle at 50% 24%,#15303a 0,#071119 38%,#020609 78%)',color:'#f6fafc',fontFamily:'var(--font-sans)'}}>
      <section style={{boxSizing:'border-box',minWidth:0,width:'min(520px,100%)',padding:'clamp(26px,6vw,46px)',border:'1px solid rgba(188,239,246,.15)',borderRadius:32,background:'rgba(5,14,20,.72)',boxShadow:'0 30px 100px rgba(0,0,0,.42)',backdropFilter:'blur(22px)'}}>
        <Link href="/home" style={{display:'inline-flex',alignItems:'center',minHeight:48,minWidth:48,color:'#a9dce4',textDecoration:'none'}}>← Home</Link>
        <p style={{margin:'44px 0 0',fontSize:11,letterSpacing:'.22em',textTransform:'uppercase',color:'#88aeb7'}}>Private threshold</p>
        <h1 style={{margin:'10px 0 12px',fontSize:'clamp(42px,9vw,66px)',lineHeight:.94,letterSpacing:'-.055em'}}>Enter your world.</h1>
        <p role="status" aria-live="polite" style={{minHeight:48,color:'#b8c9cf',lineHeight:1.55}}>{message}</p>

        {state === 'signed-in' && user ? (
          <div>
            <p style={{color:'#d9f5f8'}}>Signed in as <strong><bdi>{user.email ?? 'your private account'}</bdi></strong>.</p>
            <div style={{display:'flex',gap:10,flexWrap:'wrap',marginTop:24}}><Link href="/home" style={primary}>Open Home</Link><Link href="/passport" style={secondary}>Passport</Link><button type="button" onClick={() => void leave()} style={buttonSecondary}>Sign out</button></div>
          </div>
        ) : (
          <div style={{marginTop:24,display:'flex',gap:10,flexWrap:'wrap'}}>
            <button type="button" disabled={state==='unavailable'||state==='working'||(nativeIos&&!nativeGoogleConfigured())} onClick={() => void enter()} style={buttonPrimary}>{state==='working'?'Opening provider...':nativeIos?'Continue with Google':'Continue securely'}</button>
            {nativeIos ? <button type="button" disabled={state==='unavailable'||state==='working'||!nativeAppleConfigured()} onClick={() => void enterApple()} style={buttonApple}>Sign in with Apple</button> : null}
          </div>
        )}

        <p style={{margin:'34px 0 0',fontSize:12,lineHeight:1.55,color:'#7897a0'}}>Identity verification happens with the configured Firebase provider. URAI does not collect the provider password or create demo identity. Private routes remain fail-closed when account authority is unavailable.</p>
      </section>
    </main>
  )
}

const primary = {boxSizing:'border-box',minHeight:48,minWidth:48,maxWidth:'100%',textAlign:'center',display:'inline-flex',alignItems:'center',justifyContent:'center',padding:'11px 16px',borderRadius:999,background:'#e9fbfd',color:'#071116',fontWeight:800,textDecoration:'none'} as const
const secondary = {boxSizing:'border-box',minHeight:48,minWidth:48,maxWidth:'100%',textAlign:'center',display:'inline-flex',alignItems:'center',justifyContent:'center',padding:'11px 16px',borderRadius:999,border:'1px solid rgba(255,255,255,.17)',color:'#edf7f9',fontWeight:700,textDecoration:'none'} as const
const buttonPrimary = {...primary,border:0,cursor:'pointer'} as const
const buttonSecondary = {...secondary,background:'transparent',cursor:'pointer'} as const
const buttonApple = {...buttonSecondary,background:'#000',color:'#fff'} as const

function nativeGoogleConfigured() {
  const platform = Capacitor.getPlatform()
  return Capacitor.isPluginAvailable('FirebaseAuthentication') && ((platform === 'android' && process.env.NEXT_PUBLIC_URAI_NATIVE_GOOGLE_AUTH_READY === 'true') || (platform === 'ios' && process.env.NEXT_PUBLIC_URAI_IOS_GOOGLE_AUTH_READY === 'true'))
}
function nativeAppleConfigured() {
  return Capacitor.getPlatform() === 'ios' && process.env.NEXT_PUBLIC_URAI_IOS_APPLE_AUTH_READY === 'true' && Capacitor.isPluginAvailable('FirebaseAuthentication')
}
function nativeIdentityConfigured() { return nativeGoogleConfigured() || nativeAppleConfigured() }
