import { notFound, redirect } from 'next/navigation'

function publicDemoRoutesAllowed() {
  return process.env.NEXT_PUBLIC_ALLOW_PUBLIC_DEMO_ROUTES === 'true'
    || process.env.NODE_ENV !== 'production'
}

export default function DemoLifeMapCompatibilityPage() {
  if (!publicDemoRoutesAllowed()) notFound()
  redirect('/life-map?demo=1&from=demo-life-map')
}
