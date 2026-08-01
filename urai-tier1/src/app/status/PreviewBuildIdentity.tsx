'use client'

import { useEffect, useState } from 'react'

type PreviewBuildIdentityProps = {
  fullSha: string
  shortSha: string
}

function isAllowedPreviewHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase()
  return normalized === 'localhost'
    || normalized === '127.0.0.1'
    || normalized === '[::1]'
    || normalized.endsWith('.web.app')
    || normalized.endsWith('.firebaseapp.com')
}

export default function PreviewBuildIdentity({ fullSha, shortSha }: PreviewBuildIdentityProps) {
  const [isPreviewOrigin, setIsPreviewOrigin] = useState(false)

  useEffect(() => {
    setIsPreviewOrigin(isAllowedPreviewHostname(window.location.hostname))
  }, [])

  if (!isPreviewOrigin) return null

  return (
    <aside
      className="mb-5 rounded-2xl border border-violet-200/20 bg-violet-200/[0.07] px-5 py-4 text-violet-50/90"
      data-testid="urai-embedded-build-identity"
      data-preview-build-identity={fullSha}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-violet-200">
            Embedded build identity · non-authoritative
          </p>
          <code className="mt-1 block font-mono text-sm font-black" title={fullSha}>
            {shortSha}
          </code>
        </div>
        <p className="max-w-2xl text-xs font-semibold leading-5 text-violet-50/75">
          This commit identity is exposed only on allowlisted non-production preview origins for diagnostics. It never substitutes for the protected urai.app release fingerprint and grants no production authority.
        </p>
      </div>
    </aside>
  )
}
