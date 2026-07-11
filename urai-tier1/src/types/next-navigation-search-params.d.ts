import type { ReadonlyURLSearchParams } from 'next/navigation'

declare module 'next/navigation' {
  /**
   * URAI is App Router-only. Runtime route components are always rendered
   * beneath Suspense boundaries, so useSearchParams resolves to a concrete
   * ReadonlyURLSearchParams instance rather than the Pages Router null union.
   */
  export function useSearchParams(): ReadonlyURLSearchParams
}
