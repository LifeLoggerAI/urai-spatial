'use client'

import type { ComponentPropsWithoutRef } from 'react'
import styles from './DocumentScrollArea.module.css'

/** Document routes own their scrolling inside the fixed spatial viewport. */
export default function DocumentScrollArea({ className = '', style, children, onKeyDown, ...props }: ComponentPropsWithoutRef<'main'>) {
  return (
    <main
      tabIndex={0}
      {...props}
      data-document-scroll-owner="true"
      className={`${styles.scrollArea} ${className}`}
      style={{ ...style, boxSizing: 'border-box', height: '100dvh', minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}
      onKeyDown={event => {
        onKeyDown?.(event)
        if (event.defaultPrevented || event.target !== event.currentTarget || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
        if (event.key !== 'Home' && event.key !== 'End') return
        // The fixed world viewport cannot reliably receive native document-key scrolling.
        // Only a focused document owner handles these keys; child controls keep their defaults.
        event.preventDefault()
        event.currentTarget.scrollTo({ top: event.key === 'Home' ? 0 : event.currentTarget.scrollHeight, behavior: 'instant' })
      }}
    >
      {children}
    </main>
  )
}
