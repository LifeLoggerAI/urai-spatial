import { NextRequest, NextResponse } from 'next/server'

// Explicitly published, privacy-safe, static demo image assets may be used by
// Focus/Replay even while interactive /demo routes remain disabled in production.
// Do not widen this to /demo/**, arbitrary assets, or private media paths.
const PUBLIC_DEMO_MEMORY_ARTIFACT = /^\/demo\/memories\/(?:recovery-bloom|threshold-storm|mirror-focus|ritual-echo|dream-signal|calm-return)\.svg$/

function enabled(...values: Array<string | undefined>) {
  return values.some((value) => value === 'true')
}

function routeAllowed(pathname: string) {
  if (process.env.NODE_ENV !== 'production') return true

  if (pathname.startsWith('/admin')) {
    return enabled(process.env.NEXT_PUBLIC_ALLOW_ADMIN_ROUTES, process.env.URAI_ALLOW_ADMIN_ROUTES)
  }

  if (PUBLIC_DEMO_MEMORY_ARTIFACT.test(pathname)) return true

  // Guard the /demo path segment, not unrelated /demonstration-style routes.
  if (pathname === '/demo' || pathname.startsWith('/demo/')) {
    return enabled(process.env.NEXT_PUBLIC_ALLOW_PUBLIC_DEMO_ROUTES, process.env.URAI_ALLOW_PUBLIC_DEMO_ROUTES)
  }

  if (pathname.startsWith('/internal') || pathname.startsWith('/brand-system')) {
    return enabled(process.env.NEXT_PUBLIC_ALLOW_INTERNAL_ROUTES, process.env.URAI_ALLOW_INTERNAL_ROUTES)
  }

  return true
}

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === '/home') {
    return NextResponse.rewrite(new URL('/', request.url))
  }

  if (routeAllowed(request.nextUrl.pathname)) return NextResponse.next()

  return NextResponse.rewrite(new URL('/_not-found', request.url), { status: 404 })
}

export const config = {
  matcher: ['/home', '/admin/:path*', '/brand-system/:path*', '/demo/:path*', '/internal/:path*'],
}
