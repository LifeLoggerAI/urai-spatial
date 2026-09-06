import type { Metadata } from 'next'

// Indexing is deny-by-default at the root layout. Public routes opt in only on
// production builds so a publicly reachable preview stays noindex/nofollow.
const previewMode = process.env.NEXT_PUBLIC_URAI_PREVIEW_MODE === 'true'

export const publicIndexing: Metadata['robots'] = previewMode
  ? {
      index: false,
      follow: false,
      noarchive: true,
    }
  : {
      index: true,
      follow: true,
    }
