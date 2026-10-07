export async function fetchAuthorizedOperationalExport(args: {
  url: string; origin: string; projectId: string; jobId: string; assetId?: string; file: 'export' | 'manifest' | 'runtime'; current: () => boolean;
  getIdToken: () => Promise<string>; fetcher?: typeof fetch;
}) {
  const endpoint = new URL(args.url, args.origin)
  const hosted = endpoint.origin === args.origin && endpoint.pathname === '/api/privacy/export/download'
    && (endpoint.protocol === 'https:' || (endpoint.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(endpoint.hostname)))
  const direct = endpoint.protocol === 'https:' && endpoint.hostname === `us-central1-${args.projectId}.cloudfunctions.net`
    && ['/downloadOperationalExportPackage', '/downloadExportPackage'].includes(endpoint.pathname) && !endpoint.port
  if (!/^[a-z][a-z0-9-]{4,61}[a-z0-9]$/.test(args.projectId) || (!hosted && !direct)
    || endpoint.username || endpoint.password || endpoint.hash
    || endpoint.searchParams.get('jobId') !== args.jobId || endpoint.searchParams.get('file') !== args.file
    || (args.file === 'runtime' && endpoint.searchParams.get('assetId') !== args.assetId)) {
    throw new Error('The private export endpoint is not the current application or project.')
  }
  if (!args.current()) throw new Error('Current export session is required.')
  const token = await args.getIdToken()
  if (!token || !args.current()) throw new Error('Current export session is required.')
  const response = await (args.fetcher ?? fetch)(endpoint.toString(), {
    method: 'GET', headers: { Authorization: `Bearer ${token}` }, credentials: 'omit',
    redirect: 'error', cache: 'no-store', referrerPolicy: 'no-referrer',
  })
  if (!args.current() || !response.ok || response.redirected || !response.body) {
    await response.body?.cancel().catch(() => undefined)
    throw new Error('Current export authority is unavailable. Review consent or request a new export.')
  }
  const expectedType = args.file === 'runtime' ? 'application/octet-stream' : 'application/json'
  if (response.headers.get('content-type')?.split(';')[0] !== expectedType) {
    await response.body.cancel(); throw new Error('The export response has an unexpected format.')
  }
  const reader = response.body.getReader(), chunks: Uint8Array<ArrayBuffer>[] = []
  let size = 0
  try {
    while (true) {
      if (!args.current()) throw new Error('Export session changed.')
      const result = await reader.read()
      if (!args.current()) throw new Error('Export session changed.')
      if (result.done) break
      size += result.value.byteLength
      if (size > 128 * 1024 * 1024) throw new Error('Export exceeds this device download limit.')
      chunks.push(new Uint8Array(result.value))
    }
    return new Blob(chunks, { type: expectedType })
  } finally { await reader.cancel().catch(() => undefined); reader.releaseLock() }
}
