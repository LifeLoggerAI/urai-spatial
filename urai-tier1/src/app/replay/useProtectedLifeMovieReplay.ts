'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getApp, getApps, initializeApp } from 'firebase/app'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { app as spatialApp } from '@/lib/firebase/client'
import type { SelectedMemory, SelectedMemoryMedia } from '@/spatial/memory/selectedMemoryContract'
import { parsePrivateLifeMovieTimeline, selectPrivateLifeMovieSegment, type PrivateLifeMovieTimeline, type PrivateLifeMovieSegment } from './privateLifeMovieSegmentTimeline'

const PLAN = /^lmp_[A-Za-z0-9_-]{20,64}$/
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/
const MAX_BYTES = 64 * 1024 * 1024
const EXPIRY_MS = 50_000
const EMPTY = { status: 'absent' as const, media: null, captions: null }
type Playback = {
  status: 'absent' | 'loading' | 'ready' | 'unavailable'
  media: SelectedMemoryMedia | null
  captions: string | null
  timeline?: PrivateLifeMovieTimeline
  segment?: PrivateLifeMovieSegment
  seekOffsetMs?: number
  resumeAfterSwitch?: boolean
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
    return { url, apiKey, authDomain, projectId,
      segmented: process.env.NEXT_PUBLIC_URAI_SPATIAL_SEGMENTED_MOVIE_ENABLED === 'true' }
  } catch { return null }
}

/** The original Replay remains the visual/control owner. This optional adapter
 * requests only the selected memory's final output, not arbitrary storage.
 * Server-side Studio+Spatial+Jobs checks remain authoritative. A Studio login
 * must already exist for the separately configured Firebase project. */
export function useProtectedLifeMovieReplay(memory: SelectedMemory | null, planId: string | null, movieId: string | null) {
  const [state, setState] = useState<Playback>(EMPTY)
  const segmentSelect = useRef<((globalMs: number, resume: boolean) => void) | null>(null)
  const seekTo = useCallback((globalMs: number, resume = false) => segmentSelect.current?.(globalMs, resume), [])
  const advance = useCallback(() => {
    const timeline = state.timeline, segment = state.segment
    if (timeline && segment && segment.index + 1 < timeline.segments.length)
      segmentSelect.current?.(timeline.segments[segment.index + 1].startMs, true)
  }, [state.timeline, state.segment])
  const key = JSON.stringify([memory?.ownerId, memory?.id, memory?.demo, memory?.privacy, planId, movieId])
  const config = useMemo(configuration, [])
  useEffect(() => {
    if (!memory || memory.demo || memory.privacy !== 'private' || memory.authorization !== 'owner' ||
        !planId || !PLAN.test(planId) || !movieId || !ID.test(movieId) || !config) {
      setState(EMPTY)
      return
    }
    // Preserve the validated configuration and selected identifiers across
    // async auth observers and nested media requests without null assertions.
    const approvedConfig = config
    const selectedMemory = memory
    const selectedMovieId = movieId
    const selectedPlanId = planId
    const studioApp = getApps().find(value => value.name === 'urai-studio-private-replay') ??
      initializeApp({ apiKey: approvedConfig.apiKey, authDomain: approvedConfig.authDomain,
        projectId: approvedConfig.projectId }, 'urai-studio-private-replay')
    const studioAuth = getAuth(studioApp), spatialAuth = getAuth(spatialApp)
    let generation = 0, active = true, revoke: (() => void) | null = null
    segmentSelect.current = null
    let stopStudio: (() => void) | null = null
    const clean = () => { generation++; revoke?.(); revoke = null; segmentSelect.current = null; setState({status:'unavailable',media:null,captions:null}) }
    const stopSpatial = onAuthStateChanged(spatialAuth, spatialUser => {
      revoke?.(); revoke = null; stopStudio?.(); stopStudio = null
      const current = ++generation
      if (!active || !spatialUser || spatialUser.uid !== selectedMemory.ownerId) { clean(); return }
      stopStudio = onAuthStateChanged(studioAuth, studioUser => {
        revoke?.(); revoke = null
        const version = ++generation
        if (!active || !studioUser) { clean(); return }
        // Capture the validated identities before nested asynchronous callbacks;
        // currentSession() still checks their live Firebase sessions before delivery.
        const verifiedSpatialUser = spatialUser, verifiedStudioUser = studioUser
        const controller = new AbortController()
        const urls: string[] = []
        let expiryTimer: number | null = null
        let segmentController: AbortController | null = null
        let segmentVersion = 0
        const clearUrls = () => { for(const url of urls.splice(0)) URL.revokeObjectURL(url) }
        const release = () => {
          controller.abort(); segmentController?.abort(); segmentVersion++
          if (expiryTimer !== null) window.clearTimeout(expiryTimer)
          clearUrls(); segmentSelect.current = null
        }
        if (!approvedConfig.segmented) expiryTimer = window.setTimeout(() => {
          if (active && version === generation) clean()
        }, EXPIRY_MS)
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

            // Strictly opt-in: the accepted original final-file path below is
            // untouched unless the approved public segmented feature flag is on.
            if (approvedConfig.segmented) {
              let timeline: PrivateLifeMovieTimeline | null = null
              async function authenticatedPost(body: Record<string, unknown>, signal: AbortSignal) {
                const [currentSpatialToken, currentStudioToken] = await Promise.all([
                  verifiedSpatialUser.getIdToken(true), verifiedStudioUser.getIdToken(true),
                ])
                if (!currentSession() || signal.aborted) throw new Error('private_movie_identity_changed')
                return fetch(new URL('/api/studio/spatial-private-media', approvedConfig.url), {
                  method:'POST',mode:'cors',credentials:'omit',cache:'no-store',
                  headers:{authorization:'Bearer '+currentStudioToken,
                    'x-urai-spatial-id-token':currentSpatialToken,'content-type':'application/json'},
                  body:JSON.stringify(body),signal,redirect:'error',referrerPolicy:'no-referrer',
                })
              }
              async function readTimeline(signal: AbortSignal) {
                const response = await authenticatedPost({action:'read-spatial-timeline',
                  memoryId:selectedMemory.id,movieId:selectedMovieId,planId:selectedPlanId}, signal)
                if (!currentSession() || signal.aborted || response.status !== 200 ||
                    !response.headers.get('content-type')?.startsWith('application/json') ||
                    !response.headers.get('cache-control')?.includes('no-store'))
                  throw new Error('private_timeline_delivery_denied')
                const body = await response.text()
                if (!currentSession() || signal.aborted || body.length > 96 * 1024)
                  throw new Error('private_timeline_size_invalid')
                return parsePrivateLifeMovieTimeline(JSON.parse(body),selectedMovieId,selectedPlanId)
              }
              async function loadSegment(index: number, localMs: number, resume: boolean) {
                const requestNumber = ++segmentVersion
                segmentController?.abort()
                const requestController = new AbortController()
                segmentController = requestController
                const cancelWithSession = () => requestController.abort()
                controller.signal.addEventListener('abort',cancelWithSession,{once:true})
                const inSession = () => currentSession() && !requestController.signal.aborted &&
                  requestNumber === segmentVersion
                clearUrls()
                setState({status:'loading',media:null,captions:null,timeline:timeline ?? undefined})
                try {
                  if (!timeline || timeline.expiresAt <= Date.now() + 5000) {
                    const refreshed = await readTimeline(requestController.signal)
                    if (timeline && refreshed.playlistDigest !== timeline.playlistDigest)
                      throw new Error('private_timeline_changed')
                    timeline = refreshed
                  }
                  if (!inSession()) throw new Error('private_segment_request_superseded')
                  const segment = timeline.segments[index]
                  if (!segment || !Number.isFinite(localMs) || localMs < 0 ||
                      localMs >= segment.endMs - segment.startMs)
                    throw new Error('private_segment_selector_invalid')
                  async function getSegment(kind: 'mp4' | 'srt') {
                    const result = await authenticatedPost({action:'deliver-spatial-segment',
                      memoryId:selectedMemory.id,movieId:selectedMovieId,planId:selectedPlanId,
                      kind,segmentIndex:index},requestController.signal)
                    const mime = kind === 'mp4' ? 'video/mp4' : 'application/x-subrip'
                    const length = Number(result.headers.get('content-length'))
                    if (!inSession() || result.status !== 200 ||
                        result.headers.get('content-type') !== mime ||
                        !result.headers.get('cache-control')?.includes('no-store') ||
                        !Number.isSafeInteger(length) || length < 1 ||
                        length > (kind === 'mp4' ? MAX_BYTES : 2 * 1024 * 1024) ||
                        result.headers.get('x-urai-private-playlist-digest') !== timeline?.playlistDigest ||
                        result.headers.get('x-urai-private-segment-index') !== String(segment.index) ||
                        result.headers.get('x-urai-private-segment-start-ms') !== String(segment.startMs) ||
                        result.headers.get('x-urai-private-segment-end-ms') !== String(segment.endMs))
                      throw new Error('private_segment_metadata_invalid')
                    const bytes = await result.arrayBuffer()
                    if (!inSession() || bytes.byteLength !== length)
                      throw new Error('private_segment_integrity_invalid')
                    return { blob: new Blob([bytes], { type:mime }),
                      playlist:result.headers.get('x-urai-private-playlist-digest') }
                  }
                  const video = await getSegment('mp4'), captions = await getSegment('srt')
                  if (!inSession() || !video.playlist || video.playlist !== captions.playlist)
                    throw new Error('private_movie_caption_binding_invalid')
                  const transcript = await captions.blob.text()
                  if (!inSession() || transcript.length > 2 * 1024 * 1024)
                    throw new Error('private_movie_caption_unavailable')
                  // Only one private video Blob URL exists at a time.
                  const url = URL.createObjectURL(video.blob)
                  if (!inSession()) { URL.revokeObjectURL(url); return }
                  urls.push(url)
                  setState({status:'ready',media:{kind:'video',url,caption:'Authorized private Life Movie'},
                    captions:transcript,timeline,segment,seekOffsetMs:localMs,resumeAfterSwitch:resume})
                  if (expiryTimer !== null) window.clearTimeout(expiryTimer)
                  expiryTimer = window.setTimeout(() => {
                    if (inSession() && timeline && timeline.expiresAt <= Date.now()) clean()
                  }, Math.max(1,timeline.expiresAt - Date.now()))
                } catch {
                  if (inSession()) clean()
                } finally {
                  controller.signal.removeEventListener('abort',cancelWithSession)
                }
              }
              const authorizedTimeline = await readTimeline(controller.signal)
              if (!currentSession()) throw new Error('private_timeline_identity_changed')
              timeline = authorizedTimeline
              segmentSelect.current = (globalMs, resume) => {
                if (!currentSession() || !timeline) return
                try {
                  const choice = selectPrivateLifeMovieSegment(timeline,globalMs)
                  void loadSegment(choice.segment.index,choice.localMs,resume)
                } catch { clean() }
              }
              await loadSegment(authorizedTimeline.segments[0].index,0,false)
              return
            }
            async function retrieve(kind: 'mp4' | 'srt') {
              const result = await fetch(new URL('/api/studio/spatial-private-media', approvedConfig.url), {
                method:'POST',mode:'cors',credentials:'omit',cache:'no-store',
                headers:{authorization:'Bearer '+studioToken,
                  'x-urai-spatial-id-token':spatialToken,'content-type':'application/json'},
                body:JSON.stringify({action:'deliver-spatial-final',
                  memoryId:selectedMemory.id,movieId:selectedMovieId,planId:selectedPlanId,kind}),signal:controller.signal,
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
    })
    const offline = () => clean()
    window.addEventListener('offline',offline)
    return () => { active = false; generation++; revoke?.(); stopStudio?.(); stopSpatial(); window.removeEventListener('offline',offline) }
  }, [key, config, memory, planId, movieId])
  return { ...state, seekTo, advance }
}
