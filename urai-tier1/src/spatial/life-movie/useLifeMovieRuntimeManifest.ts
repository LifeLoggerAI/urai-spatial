'use client'

import { useEffect, useState } from 'react'
import { getAuth, onAuthStateChanged, type User } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { app, firebasePublicEnvReady, getFirebaseDb } from '@/lib/firebase/client'
import { parseLifeMovieRuntimeManifest, type LifeMovieManifestResult } from './lifeMovieRuntimeContract'

type ManifestLoadState = LifeMovieManifestResult | { status: 'loading'; manifest: null; message: string }

const LOADING: ManifestLoadState = {
  status: 'loading',
  manifest: null,
  message: 'Opening Life Movie manifest…',
}

type BoundManifestResult = {
  movieId: string | null
  actor: User | null
  result: ManifestLoadState
}

export function useLifeMovieRuntimeManifest(movieId: string | null) {
  // The selected movie and Firebase actor are part of the result authority.
  // A route or account change must hide the old manifest on the very next
  // render, before the previous listener's effect cleanup can run.
  const [bound, setBound] = useState<BoundManifestResult>({ movieId, actor: null, result: LOADING })
  const publish = (result: ManifestLoadState, actor: User | null = null) => {
    setBound({ movieId, actor, result })
  }

  useEffect(() => {
    let cancelled = false
    let generation = 0
    let detachManifest: (() => void) | undefined
    const detach = () => { generation += 1; detachManifest?.(); detachManifest = undefined }

    if (!movieId) {
      publish({ status: 'unavailable', manifest: null, message: 'No Life Movie manifest was requested.' })
      return () => { cancelled = true }
    }

    if (!firebasePublicEnvReady) {
      publish({ status: 'unavailable', manifest: null, message: 'Life Movie authority is unavailable.' })
      return () => { cancelled = true }
    }

    const auth = getAuth(app)
    const stop = onAuthStateChanged(auth, user => {
      if (cancelled) return
      detach()
      const version = generation
      const current = () => !cancelled && generation === version && auth.currentUser === user
      if (!user) {
        publish({ status: 'unauthorized', manifest: null, message: 'Sign in to open this private Life Movie.' })
        return
      }

      publish(LOADING, user)
      try {
        detachManifest = onSnapshot(doc(getFirebaseDb(), 'users', user.uid, 'lifeMovies', movieId), snapshot => {
          if (!current()) return
          if (!snapshot.exists()) {
            publish({ status: 'unavailable', manifest: null, message: 'Life Movie manifest could not be found.' }, user)
            return
          }
          publish(parseLifeMovieRuntimeManifest(snapshot.data(), user.uid), user)
        }, () => { if (current()) publish({ status: 'unavailable', manifest: null, message: 'Life Movie manifest could not be loaded.' }, user) })
      } catch (error) {
        if (!current()) return
        publish({
          status: 'unavailable',
          manifest: null,
          message: error instanceof Error ? error.message : 'Life Movie manifest could not be loaded.',
        }, user)
      }
    })

    return () => {
      cancelled = true
      detach()
      stop()
    }
  }, [movieId])

  // A changed selector never exposes the preceding movie's ready state.
  if (bound.movieId !== movieId) return LOADING
  // Firebase can update currentUser before onAuthStateChanged and React
  // effect cleanup run. Match the exact User object, not just its UID.
  if (bound.actor && (!firebasePublicEnvReady || getAuth(app).currentUser !== bound.actor)) return LOADING
  return bound.result
}
