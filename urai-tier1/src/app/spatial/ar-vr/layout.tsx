import type { ReactNode } from 'react'
import './aaa-mobile.css'

export default function XrPortalLayout({ children }: { children: ReactNode }) {
  return <div className="urai-xr-route-shell">{children}</div>
}
