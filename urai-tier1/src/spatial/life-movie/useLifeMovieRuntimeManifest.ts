'use client'

import { useEffect, useState } from 'react'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { app, firebasePublicEnvReady, getFirebaseDb } from '@/lib/firebase/client'
import { parseLifeMovieRuntimeManifest, type LifeMovieManifestResult } from './lifeMovieRuntimeContract'

const LOADING: LifeMovieManifestResult | { status: 'loading'; manifest: null; message: string } = {
  status: 'loading',
  manifest: null,
  message: 'Opening Life Movie manifest…',
}

export function useLifeMovieRuntimeManifest(movieId: string | null) {
  const [result, setResult] = useState(LOADING)

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

    const auth = getAuth(app)
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
          setResult(parseLifeMovieRuntimeManifest(snapshot.data(), user.uid))
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

  return result
}
