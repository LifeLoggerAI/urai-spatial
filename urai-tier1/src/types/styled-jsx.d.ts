import 'react'

declare module 'react' {
  interface StyleHTMLAttributes<T> extends HTMLAttributes<T> {
    /**
     * Next.js styled-jsx marker used by inline component styles.
     * Kept local so runtime typecheck accepts existing <style jsx> blocks
     * without converting the V1 spatial shell styling during launch hardening.
     */
    jsx?: boolean
    global?: boolean
  }
}
