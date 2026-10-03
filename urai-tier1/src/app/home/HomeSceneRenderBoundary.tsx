'use client'

import { Component, type ReactNode } from 'react'

type Props = {
  children: ReactNode
  onFailure: (error: Error) => void
}

// Canvas forwards renderer errors to this DOM boundary. The runtime owns the
// fallback and keys this boundary again only after an explicit retry.
export default class HomeSceneRenderBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error) {
    this.props.onFailure(error)
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}
