import { NextRequest, NextResponse } from 'next/server'

function enabled(...values: Array<string | undefined>) {
  return values.some((value) => value === 'true')
}

function routeAllowed(pathname: string) {
  if (process.env.NODE_ENV !== 'production') return true

  if (pathname.startsWith('/admin')) {
    return enabled(process.env.NEXT_PUBLIC_ALLOW_ADMIN_ROUTES, process.env.URAI_ALLOW_ADMIN_ROUTES)
  }

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
