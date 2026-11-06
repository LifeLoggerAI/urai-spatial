'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { getAuth, type User } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { app, firebasePublicEnvReady, getFirebaseDb } from '@/lib/firebase/client'
import {
  advanceLifeMovieConsentEpoch,
  initialLifeMovieConsentEpoch,
  sameLifeMovieConsentEpoch,
  type LifeMovieConsentEpoch,
} from './lifeMovieConsentEpoch'

export function useLifeMovieConsentEpoch(user: User | null | undefined) {
  const [epoch, setEpoch] = useState<LifeMovieConsentEpoch>(initialLifeMovieConsentEpoch)
  const current = useRef<LifeMovieConsentEpoch>(initialLifeMovieConsentEpoch())
  const isCurrent = useCallback((ownerId: string, revision: number): boolean =>
    firebasePublicEnvReady && !!user && getAuth(app).currentUser === user && user.uid === ownerId
      && sameLifeMovieConsentEpoch(current.current, ownerId, revision), [user])

  useEffect(() => {
    const reset = initialLifeMovieConsentEpoch(user?.uid ?? null)
    current.current = reset
    setEpoch(reset)
    if (!user || !firebasePublicEnvReady) return
    let cancelled = false
    const auth = getAuth(app)
    const stillOwner = () => !cancelled && auth.currentUser === user
    let detach: (() => void) | undefined
    try {
      detach = onSnapshot(doc(getFirebaseDb(), 'users', user.uid, 'privacyPolicy', 'current'), snapshot => {
        if (!stillOwner()) return
        const next = advanceLifeMovieConsentEpoch(current.current, user.uid,
          snapshot.exists() ? snapshot.data() : undefined)
        current.current = next
        setEpoch(next)
      }, () => {
        if (!stillOwner()) return
        const next = advanceLifeMovieConsentEpoch(current.current, user.uid, undefined)
        current.current = next
        setEpoch(next)
      })
    } catch {
      const next = advanceLifeMovieConsentEpoch(current.current, user.uid, undefined)
      current.current = next
      setEpoch(next)
    }
    return () => {
      cancelled = true
      current.current = initialLifeMovieConsentEpoch(null)
      detach?.()
    }
  }, [user])

  return { epoch, isCurrent }
}
