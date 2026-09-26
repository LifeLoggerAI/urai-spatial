import * as THREE from 'three'
import type { SelectedMemoryMedia } from '@/spatial/memory/selectedMemoryContract'
import { focusMediaSize } from './focusStellarTexture'

export type FocusMediaState = 'loading' | 'ready' | 'unavailable'
export type FocusMediaLayer = { texture: THREE.Texture; size: [number, number, number] }

/** The caller remounts this lease on selected memory identity or source URL change. */
export function loadFocusSourceMedia(
  media: SelectedMemoryMedia,
  onReady: (layer: FocusMediaLayer | null) => void,
  onState: (state: FocusMediaState) => void,
) {
  let active = true
  let settled = false
  let texture: THREE.Texture | null = null
  const image = media.kind === 'image' ? new Image() : null
  const video = media.kind === 'video' ? document.createElement('video') : null
  const failed = () => {
    if (!active) return
    settled = true
    texture?.dispose()
    texture = null
    onReady(null)
    onState('unavailable')
  }
  const ready = (source: HTMLImageElement | HTMLVideoElement, width: number, height: number) => {
    if (!active || settled) return
    const size = focusMediaSize(width, height)
    if (size[0] === 0 || size[1] === 0) { failed(); return }
    settled = true
    texture = video ? new THREE.VideoTexture(video) : new THREE.Texture(source)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.minFilter = THREE.LinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.needsUpdate = true
    onReady({ texture, size })
    onState('ready')
  }
  onState('loading')
  if (image) {
    image.crossOrigin = 'anonymous'
    image.onload = () => ready(image, image.naturalWidth, image.naturalHeight)
    image.onerror = failed
    image.src = media.url
  } else if (video) {
    video.crossOrigin = 'anonymous'
    video.muted = true
    video.playsInline = true
    video.preload = 'metadata'
    video.onloadeddata = () => ready(video, video.videoWidth, video.videoHeight)
    video.onerror = failed
    video.src = media.url
    video.load()
  } else failed()
  return () => {
    active = false
    if (image) { image.onload = null; image.onerror = null; image.removeAttribute('src') }
    if (video) {
      video.onloadeddata = null
      video.onerror = null
      video.pause()
      video.removeAttribute('src')
      video.load()
    }
    texture?.dispose()
    texture = null
  }
}
