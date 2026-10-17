'use client'

import { useEffect, useMemo, useState } from 'react'
import { getApp, getApps, initializeApp } from 'firebase/app'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { app as spatialApp } from '@/lib/firebase/client'
import type { SelectedMemory, SelectedMemoryMedia } from '@/spatial/memory/selectedMemoryContract'

const PLAN = /^lmp_[A-Za-z0-9_-]{20,64}$/
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/
const MAX_BYTES = 64 * 1024 * 1024
const EXPIRY_MS = 50_000
const EMPTY = { status: 'absent' as const, media: null, captions: null }
type Playback = {
  status: 'absent' | 'loading' | 'ready' | 'unavailable'
  media: SelectedMemoryMedia | null
  captions: string | null
}

function configuration() {
  if (process.env.NEXT_PUBLIC_URAI_SPATIAL_PRIVATE_MOVIE_ENABLED !== 'true') return null
  const apiKey = process.env.NEXT_PUBLIC_URAI_STUDIO_FIREBASE_API_KEY
  const authDomain = process.env.NEXT_PUBLIC_URAI_STUDIO_FIREBASE_AUTH_DOMAIN
  const projectId = process.env.NEXT_PUBLIC_URAI_STUDIO_FIREBASE_PROJECT_ID
  const raw = process.env.NEXT_PUBLIC_URAI_STUDIO_PRIVATE_MEDIA_ORIGIN
  if (!apiKey || !authDomain || projectId !== 'urai-studio' || !raw) return null
  try {
    const url = new URL(raw)
    const local = process.env.NODE_ENV === 'development' &&
      ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    if (url.origin !== raw || url.username || url.password || url.search || url.hash ||
      (url.protocol !== 'https:' && !(local && url.protocol === 'http:'))) return null
    return { url, apiKey, authDomain, projectId }
  } catch { return null }
}

/** The original Replay remains the visual/control owner. This optional adapter
 * requests only the selected memory's final output, not arbitrary storage.
 * Server-side Studio+Spatial+Jobs checks remain authoritative. A Studio login
 * must already exist for the separately configured Firebase project. */
export function useProtectedLifeMovieReplay(memory: SelectedMemory | null, planId: string | null, movieId: string | null) {
  const [state, setState] = useState<Playback>(EMPTY)
  const key = JSON.stringify([memory?.ownerId, memory?.id, memory?.demo, memory?.privacy, planId, movieId])
  const config = useMemo(configuration, [])
  useEffect(() => {
    if (!memory || memory.demo || memory.privacy !== 'private' || memory.authorization !== 'owner' ||
        !planId || !PLAN.test(planId) || !movieId || !ID.test(movieId) || !config) {
      setState(EMPTY)
      return
    }
    const studioApp = getApps().find(value => value.name === 'urai-studio-private-replay') ??
      initializeApp({ apiKey: config.apiKey, authDomain: config.authDomain,
        projectId: config.projectId }, 'urai-studio-private-replay')
    const studioAuth = getAuth(studioApp), spatialAuth = getAuth(spatialApp)
    let generation = 0, active = true, revoke: (() => void) | null = null
    const clean = () => { generation++; revoke?.(); revoke = null; setState({status:'unavailable',media:null,captions:null}) }
    const stopSpatial = onAuthStateChanged(spatialAuth, spatialUser => {
      revoke?.(); revoke = null
      const current = ++generation
      if (!active || !spatialUser || spatialUser.uid !== memory.ownerId) { clean(); return }
      const stopStudio = onAuthStateChanged(studioAuth, studioUser => {
        revoke?.(); revoke = null
        const version = ++generation
        if (!active || !studioUser) { clean(); return }
        const controller = new AbortController()
        const urls: string[] = []
        const expired = window.setTimeout(() => controller.abort(), EXPIRY_MS)
        const release = () => { controller.abort(); clearTimeout(expired); urls.forEach(url => URL.revokeObjectURL(url)) }
        revoke = release
        setState({status:'loading',media:null,captions:null})
        const currentSession = () => active && version === generation &&
          spatialAuth.currentUser === spatialUser && studioAuth.currentUser === studioUser &&
          !controller.signal.aborted && navigator.onLine !== false
        void (async () => {
          try {
            const [spatialToken, studioToken] = await Promise.all([
              spatialUser.getIdToken(true), studioUser.getIdToken(true),
            ])
            if (!currentSession()) throw new Error('private_movie_identity_changed')
            async function retrieve(kind: 'mp4' | 'srt') {
              const result = await fetch(new URL('/api/studio/spatial-private-media', config.url), {
                method:'POST',mode:'cors',credentials:'omit',cache:'no-store',
                headers:{authorization:'Bearer '+studioToken,
                  'x-urai-spatial-id-token':spatialToken,'content-type':'application/json'},
                body:JSON.stringify({action:'deliver-spatial-final',
                  memoryId:memory!.id,movieId,planId,kind}),signal:controller.signal,
                redirect:'error',referrerPolicy:'no-referrer',
              })
              const mime = kind === 'mp4' ? 'video/mp4' : 'application/x-subrip'
              const length = Number(result.headers.get('content-length'))
              if (!currentSession() || result.status !== 200 || result.headers.get('content-type') !== mime ||
                  !result.headers.get('cache-control')?.includes('no-store') ||
                  !Number.isSafeInteger(length) || length < 1 || length > MAX_BYTES)
                throw new Error('private_movie_delivery_unavailable')
              const bytes = await result.arrayBuffer()
              if (!currentSession() || bytes.byteLength !== length) throw new Error('private_movie_delivery_changed')
              return { blob: new Blob([bytes],{type:mime}),
                playlist:result.headers.get('x-urai-private-playlist-digest') }
            }
            const video = await retrieve('mp4'), captions = await retrieve('srt')
            if (!currentSession() || !video.playlist || video.playlist !== captions.playlist ||
                !/^[a-f0-9]{64}$/.test(video.playlist)) throw new Error('private_movie_caption_binding_invalid')
            const url = URL.createObjectURL(video.blob); urls.push(url)
            const text = await captions.blob.text()
            if (!currentSession() || text.length > 2 * 1024 * 1024) throw new Error('private_movie_caption_unavailable')
            setState({status:'ready',media:{kind:'video',url,caption:'Authorized private Life Movie'},captions:text})
          } catch { if (active && version === generation) clean() }
        })()
      })
      const previousRevoke = revoke
      revoke = () => { previousRevoke?.(); stopStudio() }
    })
    const offline = () => clean()
    window.addEventListener('offline',offline)
    return () => { active = false; generation++; revoke?.(); stopSpatial(); window.removeEventListener('offline',offline) }
  }, [key, config, memory, planId, movieId])
  return state
}
