'use client'

import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { firebasePublicEnvReady, getFirebaseDb, getUraiAuth } from '@/lib/firebase/client'
import { parseLifeMovieRuntimeManifest, type LifeMovieManifestResult } from './lifeMovieRuntimeContract'

const LOADING: LifeMovieManifestResult | { status: 'loading'; manifest: null; message: string } = {
  status: 'loading',
  manifest: null,
  message: 'Opening Life Movie manifest…',
}

export function useLifeMovieRuntimeManifest(movieId: string | null) {
  // Route identity and authenticated owner must be checked before React effects
  // run. Otherwise a previous movie manifest can render on the first frame
  // after same-route navigation or an account switch.
  const [scoped, setScoped] = useState<{
    movieId: string | null
    ownerId: string | null
    result: typeof LOADING
  }>({ movieId: null, ownerId: null, result: LOADING })
  const setResult = (result: typeof LOADING, ownerId: string | null = null) => {
    setScoped({ movieId, ownerId, result })
  }

  useEffect(() => {
    let cancelled = false
    let generation = 0
    let detachManifest: (() => void) | undefined
    const detach = () => { generation += 1; detachManifest?.(); detachManifest = undefined }

    if (!movieId) {
      setResult({ status: 'unavailable', manifest: null, message: 'No Life Movie manifest was requested.' })
      return () => { cancelled = true }
    }

    if (!firebasePublicEnvReady) {
      setResult({ status: 'unavailable', manifest: null, message: 'Life Movie authority is unavailable.' })
      return () => { cancelled = true }
    }

    const auth = getUraiAuth()
    const stop = onAuthStateChanged(auth, user => {
      if (cancelled) return
      detach()
      const version = generation
      const current = () => !cancelled && generation === version && auth.currentUser === user
      if (!user) {
        setResult({ status: 'unauthorized', manifest: null, message: 'Sign in to open this private Life Movie.' })
        return
      }

      setResult(LOADING)
      try {
        detachManifest = onSnapshot(doc(getFirebaseDb(), 'users', user.uid, 'lifeMovies', movieId), snapshot => {
          if (!current()) return
          if (!snapshot.exists()) {
            setResult({ status: 'unavailable', manifest: null, message: 'Life Movie manifest could not be found.' })
            return
          }
          setResult(parseLifeMovieRuntimeManifest(snapshot.data(), user.uid), user.uid)
        }, () => { if (current()) setResult({ status: 'unavailable', manifest: null, message: 'Life Movie manifest could not be loaded.' }) })
      } catch (error) {
        if (!current()) return
        setResult({
          status: 'unavailable',
          manifest: null,
          message: error instanceof Error ? error.message : 'Life Movie manifest could not be loaded.',
        })
      }
    })

    return () => {
      cancelled = true
      detach()
      stop()
    }
  }, [movieId])

  if (scoped.movieId !== movieId) return LOADING
  // Never reuse a previous account's private manifest while Auth is changing.
  if (scoped.ownerId && typeof window !== 'undefined' && getUraiAuth().currentUser?.uid !== scoped.ownerId) return LOADING
  return scoped.result
}
