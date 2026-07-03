import type { ReactNode } from 'react'

export default function LifeMapLayout({ children }: { children: ReactNode }) {
  return <div className="lifemap-starfield-shell">{children}</div>
}
