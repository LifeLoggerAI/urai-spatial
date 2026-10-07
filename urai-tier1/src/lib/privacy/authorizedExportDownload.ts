export async function fetchAuthorizedOperationalExport(args: {
  url: string; origin: string; file: 'export' | 'manifest' | 'runtime';
  getIdToken: () => Promise<string>; fetcher?: typeof fetch;
}) {
  const endpoint = new URL(args.url, args.origin)
  if (endpoint.origin !== args.origin || endpoint.pathname !== '/api/privacy/export/download'
    || endpoint.username || endpoint.password || endpoint.hash
    || (endpoint.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(endpoint.hostname))) {
    throw new Error('The private export endpoint is not the current application.')
  }
  const token = await args.getIdToken()
  const response = await (args.fetcher ?? fetch)(endpoint.toString(), {
    method: 'GET', headers: { Authorization: `Bearer ${token}` }, credentials: 'omit',
    redirect: 'error', cache: 'no-store', referrerPolicy: 'no-referrer',
  })
  if (!response.ok) throw new Error('Current export authority is unavailable. Review consent or request a new export.')
  const expectedType = args.file === 'runtime' ? 'application/octet-stream' : 'application/json'
  if (!response.headers.get('content-type')?.startsWith(expectedType)) throw new Error('The export response has an unexpected format.')
  return response.blob()
}
