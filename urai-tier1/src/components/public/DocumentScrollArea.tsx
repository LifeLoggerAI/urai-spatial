import type { ComponentPropsWithoutRef } from 'react'
import styles from './DocumentScrollArea.module.css'

/** Document routes own their scrolling inside the fixed spatial viewport. */
export default function DocumentScrollArea({ className = '', style, children, ...props }: ComponentPropsWithoutRef<'main'>) {
  return (
    <main
      tabIndex={0}
      {...props}
      data-document-scroll-owner="true"
      className={`${styles.scrollArea} ${className}`}
      style={{ ...style, boxSizing: 'border-box', height: '100dvh', minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}
    >
      {children}
    </main>
  )
}
