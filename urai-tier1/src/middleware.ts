import { NextRequest, NextResponse } from 'next/server'

function enabled(...values: Array<string | undefined>) {
  return values.some((value) => value === 'true')
}

const PUBLIC_DEMO_MEMORY_ASSETS = new Set([
  '/demo/memories/recovery-bloom.svg',
  '/demo/memories/threshold-storm.svg',
  '/demo/memories/mirror-focus.svg',
  '/demo/memories/ritual-echo.svg',
  '/demo/memories/dream-signal.svg',
  '/demo/memories/calm-return.svg',
])

function routeAllowed(pathname: string) {
  if (process.env.NODE_ENV !== 'production') return true

  if (pathname.startsWith('/admin')) {
    return enabled(process.env.NEXT_PUBLIC_ALLOW_ADMIN_ROUTES, process.env.URAI_ALLOW_ADMIN_ROUTES)
  }

  if (PUBLIC_DEMO_MEMORY_ASSETS.has(pathname)) return true

  if (pathname.startsWith('/demo')) {
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
