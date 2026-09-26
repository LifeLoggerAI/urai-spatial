/** Carry only an explicitly requested demo mode across native Home links.
 * Never copy identity, private memory, provider or arbitrary query parameters.
 */
export function homeSemanticHref(destination: string, currentSearch: string): string {
  if (new URLSearchParams(currentSearch).get('demo') !== '1') return destination
  const target = new URL(destination, 'https://urai.invalid')
  target.searchParams.set('demo', '1')
  return `${target.pathname}${target.search}${target.hash}`
}
