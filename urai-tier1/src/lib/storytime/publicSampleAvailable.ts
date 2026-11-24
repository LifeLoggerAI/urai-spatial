export function publicStorytimeSampleAvailable() {
  const flags = [process.env.NEXT_PUBLIC_ALLOW_PUBLIC_DEMO_ROUTES, process.env.URAI_ALLOW_PUBLIC_DEMO_ROUTES]
  return !flags.includes('false') && (flags.includes('true') || process.env.NODE_ENV !== 'production')
}
