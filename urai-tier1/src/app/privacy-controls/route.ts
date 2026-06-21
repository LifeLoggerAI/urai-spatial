export const dynamic = 'force-static'

export function GET() {
  return Response.redirect(new URL('/passport', 'https://urai.app'), 308)
}
