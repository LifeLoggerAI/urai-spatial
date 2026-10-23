'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getApp, getApps, initializeApp } from 'firebase/app'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { app as spatialApp } from '@/lib/firebase/client'
import type { SelectedMemory, SelectedMemoryMedia } from '@/spatial/memory/selectedMemoryContract'
import { parsePrivateLifeMovieTimeline, selectPrivateLifeMovieSegment, privateLifeMovieTimelineCurrent, type PrivateLifeMovieTimeline, type PrivateLifeMovieSegment } from './privateLifeMovieSegmentTimeline'
import { createPrivateMovieReconnectPolicy } from './privateMovieReconnectPolicy'
import { privateMovieContentLengthAllowed } from './privateMovieContentLengthPolicy'
import { readBoundedPrivateMovieBlob, readBoundedPrivateMovieTimelineText } from './privateMovieResponseBoundary.mjs'

const PLAN = /^lmp_[A-Za-z0-9_-]{20,64}$/
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/
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
  selectionKey?: string
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

/** Scope any private Blob-backed media to the exact owner and movie selection. */
function scopedPlaybackForSelection(state: Playback, key: string): Playback {
  if (state.selectionKey !== key) return EMPTY
  // A backgrounded browser may delay its expiry callback. On every render,
  // fail closed before exposing the previous private Blob URL or captions.
  if (state.timeline && !privateLifeMovieTimelineCurrent(state.timeline))
    return { ...EMPTY, status: 'unavailable', selectionKey: key }
  return state
}

/** The original Replay remains the visual/control owner. This optional adapter
 * requests only the selected memory's final output, not arbitrary storage.
 * Server-side Studio+Spatial+Jobs checks remain authoritative. A Studio login
 * must already exist for the separately configured Firebase project. */
export function useProtectedLifeMovieReplay(memory: SelectedMemory | null, planId: string | null, movieId: string | null) {
  const [state, setState] = useState<Playback>(EMPTY)
  const [reconnectEpoch, setReconnectEpoch] = useState(0)
  const segmentSelect = useRef<((globalMs: number, resume: boolean) => void) | null>(null)
  const seekTo = useCallback((globalMs: number, resume = false) => segmentSelect.current?.(globalMs, resume), [])
  // Failed transport can occur without a browser 'offline' event. An explicit
  // retry never restores cached private bytes: it reruns both identity checks.
  const retry = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.onLine !== false)
      setReconnectEpoch(epoch => epoch + 1)
  }, [])
  const advance = useCallback(() => {
    const timeline = state.timeline, segment = state.segment
    if (timeline && segment && segment.index + 1 < timeline.segments.length)
      segmentSelect.current?.(timeline.segments[segment.index + 1].startMs, true)
  }, [state.timeline, state.segment])
  const key = JSON.stringify([memory?.ownerId, memory?.id, memory?.replayManifest.id,
    memory?.authorization, memory?.demo, memory?.privacy, planId, movieId])
  const config = useMemo(configuration, [])
  useEffect(() => {
    const publish = (next: Playback) => setState({ ...next, selectionKey: key })
    if (!memory || memory.demo || memory.privacy !== 'private' || memory.authorization !== 'owner' ||
        !planId || !PLAN.test(planId) || !movieId || !ID.test(movieId) || !config) {
      publish(EMPTY)
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
    const reconnect = createPrivateMovieReconnectPolicy(
      () => setReconnectEpoch(epoch => epoch + 1),
      () => navigator.onLine !== false,
    )
    segmentSelect.current = null
    let stopStudio: (() => void) | null = null
    const clean = () => { if (navigator.onLine === false) reconnect.observeOffline(); generation++; revoke?.(); revoke = null; segmentSelect.current = null; publish({status:'unavailable',media:null,captions:null}) }
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
        publish({status:'loading',media:null,captions:null})
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
                const body = await readBoundedPrivateMovieTimelineText(response, {
                  signal, isCurrent:currentSession,
                })
                if (!currentSession() || signal.aborted)
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
                  requestNumber === segmentVersion && privateLifeMovieTimelineCurrent(timeline)
                clearUrls()
                publish({status:'loading',media:null,captions:null,timeline:timeline ?? undefined})
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
                        !privateMovieContentLengthAllowed(kind,length) ||
                        result.headers.get('x-urai-private-playlist-digest') !== timeline?.playlistDigest ||
                        result.headers.get('x-urai-private-segment-index') !== String(segment.index) ||
                        result.headers.get('x-urai-private-segment-start-ms') !== String(segment.startMs) ||
                        result.headers.get('x-urai-private-segment-end-ms') !== String(segment.endMs))
                      throw new Error('private_segment_metadata_invalid')
                    const blob = await readBoundedPrivateMovieBlob(result, {
                      kind, expectedBytes:length, signal:requestController.signal, isCurrent:inSession,
                    })
                    return { blob, playlist:result.headers.get('x-urai-private-playlist-digest') }
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
                  publish({status:'ready',media:{kind:'video',url,caption:'Authorized private Life Movie'},
                    captions:transcript,timeline,segment,seekOffsetMs:localMs,resumeAfterSwitch:resume})
                  if (expiryTimer !== null) window.clearTimeout(expiryTimer)
                  const enforceTimelineExpiry = () => {
                    if (!currentSession() || !timeline) return
                    if (!privateLifeMovieTimelineCurrent(timeline)) { clean(); return }
                    // A browser timeout may fire early; rearm until the true expiry.
                    expiryTimer = window.setTimeout(enforceTimelineExpiry, Math.max(1, timeline.expiresAt - Date.now()))
                  }
                  expiryTimer = window.setTimeout(enforceTimelineExpiry, Math.max(1, timeline.expiresAt - Date.now()))
                } catch (error) {
                  // Development-only opaque cause; no tokens, identities or bytes.
                  if (process.env.NODE_ENV === 'development' && approvedConfig.segmented) {
                    const message = error instanceof Error ? error.message : ''
                    const code = /^[a-z][a-z0-9_]{2,79}$/.test(message) ? message : 'segment_delivery_error'
                    console.warn('URAI_SEGMENT_DEV_DIAGNOSTIC '+code)
                  }
                  if (currentSession() && requestNumber === segmentVersion) clean()
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
                  !privateMovieContentLengthAllowed(kind,length))
                throw new Error('private_movie_delivery_unavailable')
              const blob = await readBoundedPrivateMovieBlob(result, {
                kind, expectedBytes:length, signal:controller.signal, isCurrent:currentSession,
              })
              return { blob, playlist:result.headers.get('x-urai-private-playlist-digest') }
            }
            const video = await retrieve('mp4'), captions = await retrieve('srt')
            if (!currentSession() || !video.playlist || video.playlist !== captions.playlist ||
                !/^[a-f0-9]{64}$/.test(video.playlist)) throw new Error('private_movie_caption_binding_invalid')
            const url = URL.createObjectURL(video.blob); urls.push(url)
            const text = await captions.blob.text()
            if (!currentSession() || text.length > 2 * 1024 * 1024) throw new Error('private_movie_caption_unavailable')
            publish({status:'ready',media:{kind:'video',url,caption:'Authorized private Life Movie'},captions:text})
          } catch { if (active && version === generation) clean() }
        })()
      })
    })
    // Reconnection always establishes a fresh Firebase/Studio/Jobs authority;
    // revoked Blob URLs and old delivery receipts are never restored.
    const offline = () => { reconnect.observeOffline(); clean() }
    const online = () => reconnect.observeOnline()
    window.addEventListener('offline',offline)
    window.addEventListener('online',online)
    return () => { active = false; reconnect.dispose(); generation++; revoke?.(); stopStudio?.(); stopSpatial(); window.removeEventListener('offline',offline); window.removeEventListener('online',online) }
  }, [key, config, memory, planId, movieId, reconnectEpoch])
  const scoped = scopedPlaybackForSelection(state, key)
  // Never give a newly selected movie the prior selection's decoded media or controls.
  return { ...scoped, seekTo: scoped.status === 'ready' ? seekTo : () => {},
    advance: scoped.status === 'ready' ? advance : () => {},
    retry: scoped.status === 'unavailable' ? retry : () => {} }
}
