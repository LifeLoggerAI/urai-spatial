'use client'

import { useEffect, useState } from 'react'

type Source = { kind: 'image' | 'video'; url: string; caption?: string }

// The keyed inner component resets readiness whenever the selected source changes.
export function FocusSourceMedia(props: { media: Source; title: string; demo: boolean; compact?: boolean }) {
  return <SourceFrame key={props.media.kind + ':' + props.media.url} {...props} />
}

function SourceFrame({ media, title, demo, compact = false }: { media: Source; title: string; demo: boolean; compact?: boolean }) {
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading')
  useEffect(() => {
    if (state !== 'loading') return
    const timer = window.setTimeout(() => setState('failed'), 12_000)
    return () => window.clearTimeout(timer)
  }, [state])
  const label = state === 'loading' ? 'Loading source image'
    : state === 'failed' ? 'Source unavailable · memory preserved'
    : demo ? 'Demo source · not personal data' : 'Source moment'
  return <>
    <span className={'focusMemoryVisual focusMemoryVisualSource' + (compact ? ' compact' : '')} data-focus-media-state={state} data-focus-media-kind={media.kind}>
      {state !== 'failed' && (media.kind === 'image'
        ? <img src={media.url} alt={media.caption || 'Source image for ' + title}
            style={{ visibility: state === 'ready' ? 'visible' : 'hidden', width: '100%', height: '100%', objectFit: 'cover' }}
            onLoad={(event) => setState(event.currentTarget.naturalWidth > 0 ? 'ready' : 'failed')}
            onError={() => setState('failed')} />
        : <video src={media.url} muted playsInline preload="auto" data-focus-source-motion="still"
            aria-label={media.caption || 'Still frame from source video for ' + title}
            style={{ visibility: state === 'ready' ? 'visible' : 'hidden' }}
            onLoadedData={(event) => setState(event.currentTarget.videoWidth > 0 && event.currentTarget.readyState >= 2 ? 'ready' : 'failed')}
            onError={() => setState('failed')} />)}
      <span className="focusMemoryGlass" aria-hidden="true" />
    </span>
    <span className="focusMediaDisclosure" role="status">{media.kind === 'video' && state === 'loading' ? 'Loading source frame' : label}</span>
  </>
}
