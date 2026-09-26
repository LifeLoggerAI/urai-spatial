'use client'

import { useEffect, useMemo, useState } from 'react'
import type { SelectedMemoryMedia } from '@/spatial/memory/selectedMemoryContract'
import { makeFocusMemoryMask } from './focusStellarTexture'
import { loadFocusSourceMedia, type FocusMediaLayer, type FocusMediaState } from './focusSourceMedia'
export type { FocusMediaState } from './focusSourceMedia'

/** Source imagery shares the stellar world transform, camera depth and pixel scale. */
export function FocusMemoryMedia({ media, onState }: {
  media: SelectedMemoryMedia
  onState: (state: FocusMediaState) => void
}) {
  const mask = useMemo(() => makeFocusMemoryMask(), [])
  const [loaded, setLoaded] = useState<FocusMediaLayer | null>(null)
  useEffect(() => () => mask.dispose(), [mask])
  useEffect(() => loadFocusSourceMedia(media, setLoaded, onState), [media.kind, media.url, onState])

  if (!loaded) return null
  return <sprite name="focus-authorized-source-memory" position={[0, 0, .23]} scale={loaded.size} renderOrder={3} raycast={() => null}>
    <spriteMaterial map={loaded.texture} alphaMap={mask} transparent opacity={.94} depthWrite={false} depthTest={false} toneMapped={false} />
  </sprite>
}
