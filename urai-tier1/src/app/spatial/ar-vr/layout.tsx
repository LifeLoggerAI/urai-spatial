import type { ReactNode } from 'react'
import './aaa-mobile.css'
import './review-fixes.css'

export default function XrPortalLayout({ children }: { children: ReactNode }) {
  return <div className="urai-xr-route-shell">{children}</div>
}
