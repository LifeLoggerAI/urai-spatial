'use client'

import { useEffect, useState } from 'react'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
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

    if (!movieId) {
      setResult({ status: 'unavailable', manifest: null, message: 'No Life Movie manifest was requested.' })
      return () => { cancelled = true }
    }

    if (!firebasePublicEnvReady) {
      setResult({ status: 'unavailable', manifest: null, message: 'Life Movie authority is unavailable.' })
      return () => { cancelled = true }
    }

    const auth = getAuth(app)
    const stop = onAuthStateChanged(auth, async (user) => {
      if (cancelled) return
      if (!user) {
        setResult({ status: 'unauthorized', manifest: null, message: 'Sign in to open this private Life Movie.' })
        return
      }

      setResult(LOADING)
      try {
        const snapshot = await getDoc(doc(getFirebaseDb(), 'users', user.uid, 'lifeMovies', movieId))
        if (cancelled) return
        if (!snapshot.exists()) {
          setResult({ status: 'unavailable', manifest: null, message: 'Life Movie manifest could not be found.' })
          return
        }
        setResult(parseLifeMovieRuntimeManifest(snapshot.data(), user.uid))
      } catch (error) {
        if (cancelled) return
        setResult({
          status: 'unavailable',
          manifest: null,
          message: error instanceof Error ? error.message : 'Life Movie manifest could not be loaded.',
        })
      }
    })

    return () => {
      cancelled = true
      stop()
    }
  }, [movieId])

  return result
}
