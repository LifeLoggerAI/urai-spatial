'use client'

import { Component, type ReactNode } from 'react'

export class InterpretiveWorldRenderBoundary extends Component<
  { children: ReactNode; resetKey: string | null },
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidUpdate(previous: Readonly<{ children: ReactNode; resetKey: string | null }>) {
    if (this.state.failed && previous.resetKey !== this.props.resetKey) {
      this.setState({ failed: false })
    }
  }

  render() {
    if (this.state.failed) {
      return (
        <div role="status" data-interpretive-world-render-state="failed" style={{ display: 'grid', placeItems: 'center', padding: '2rem' }}>
          <p>This interpretive world could not be displayed. You can exit and return to Replay.</p>
        </div>
      )
    }
    return this.props.children
  }
}
