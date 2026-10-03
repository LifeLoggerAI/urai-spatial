'use client'

import { Component, type ReactNode } from 'react'

/** Keep the scene's exit and provenance controls outside renderer failures. */
export class CapturedRealityRenderBoundary extends Component<
  { children: ReactNode; resetKey: string | null },
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError() {
    // Do not retain or show a loader error containing a private signed URL.
    return { failed: true }
  }

  componentDidUpdate(previous: Readonly<{ children: ReactNode; resetKey: string | null }>) {
    // A fresh authorized delivery may recover a failed load without resetting
    // the camera during successful signed-URL renewals.
    if (this.state.failed && previous.resetKey !== this.props.resetKey) {
      this.setState({ failed: false })
    }
  }

  render() {
    if (this.state.failed) {
      return (
        <div role="status" data-captured-reality-render-state="failed" style={{ display: 'grid', placeItems: 'center', padding: '2rem' }}>
          <p>This captured place could not be displayed. You can view its provenance or exit to your memories.</p>
        </div>
      )
    }
    return this.props.children
  }
}
