'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { firebasePublicEnvReady, getUrAiAuth } from '@/lib/firebase/client'
import { ensureOwnerProfile } from '@/lib/firebase/ownerProfile'

/** Also enroll returning sessions that enter Home without visiting /login. */
export default function OwnerProfileEnrollment() {
  const [failed, setFailed] = useState(false)
  const loginRoute = usePathname() === '/login'
  useEffect(() => {
    if (!firebasePublicEnvReady) return
    const auth = getUrAiAuth()
    let active = true
    let revision = 0
    const stop = onAuthStateChanged(auth, owner => {
      const observed = ++revision
      setFailed(false)
      if (owner) void ensureOwnerProfile(owner).catch(() => {
        if (active && observed === revision && auth.currentUser === owner) setFailed(true)
      })
    }, () => { ++revision; setFailed(true) })
    return () => { active = false; ++revision; stop() }
  }, [loginRoute])
  if (!failed || loginRoute) return null
  return <aside role="status" aria-live="polite" style={{position:'fixed',top:'max(12px,env(safe-area-inset-top))',left:'max(12px,env(safe-area-inset-left))',zIndex:2147483647,maxWidth:'min(420px,calc(100vw - 24px))',padding:12,borderRadius:12,background:'#101e29',color:'#fff',fontFamily:'system-ui',fontSize:14}}>
    Account setup could not be confirmed. <Link href="/login" style={{display:'inline-flex',alignItems:'center',minHeight:48,color:'#b7efff'}}>Retry account setup or sign out</Link>
  </aside>
}
