import type { CapturedRealityHybridRegistration, CapturedRealityHybridMeshPayload } from './capturedRealityHybridGeometry'
import { capturedRealityHybridRegistrationValid } from './capturedRealityHybridGeometry'

export type CapturedRealityPrivateMeshDescriptor = {
  assetId: string
  accessMode: 'runtime' | 'proof'
  deviceTier: 'desktop' | 'mobile'
  requiresAuthorization: true
  url: string
  expiresAt: string
  meshSha256: string
  meshByteLength: number
  meshStorageGeneration: string
  splatSha256: string
  registration: CapturedRealityHybridRegistration
}
export function privateMeshDescriptorValid(
  mesh: CapturedRealityPrivateMeshDescriptor,
  expected: {assetId:string;accessMode:'runtime'|'proof';deviceTier:'desktop'|'mobile';projectId:string;splatSha256:string;now?:number},
) {
  if (!mesh || mesh.assetId!==expected.assetId || mesh.accessMode!==expected.accessMode
    || mesh.deviceTier!==expected.deviceTier || mesh.requiresAuthorization!==true
    || !/^[a-f0-9]{64}$/i.test(mesh.meshSha256) || !/^[a-f0-9]{64}$/i.test(mesh.splatSha256)
    || mesh.splatSha256!==expected.splatSha256
    || !Number.isSafeInteger(mesh.meshByteLength) || mesh.meshByteLength<32
    || mesh.meshByteLength>24*1024*1024 || mesh.meshByteLength%4!==0
    || !/^\d{1,32}$/.test(mesh.meshStorageGeneration)
    || !capturedRealityHybridRegistrationValid(mesh.registration,expected.splatSha256,expected.accessMode)) return false
  const expires=Date.parse(mesh.expiresAt)
  if (!Number.isFinite(expires) || expires<=(expected.now??Date.now()) || expires-(expected.now??Date.now())>11*60_000) return false
  try {
    const url=new URL(mesh.url)
    return url.protocol==='https:' && !url.port && !url.username && !url.password && !url.hash
      && url.hostname===`us-central1-${expected.projectId}.cloudfunctions.net`
      && url.pathname==='/streamCapturedRealityMesh'
      && url.searchParams.get('assetId')===expected.assetId
      && url.searchParams.get('accessMode')===expected.accessMode
      && url.searchParams.get('deviceTier')===expected.deviceTier
      && /^[a-f0-9]{64}$/.test(url.searchParams.get('deliveryId')??'')
      && [...url.searchParams.keys()].length===4
  } catch {return false}
}
export async function fetchPrivateHybridMesh(
  descriptor: CapturedRealityPrivateMeshDescriptor,requestHeaders:()=>Promise<Record<string,string>>,
  signal:AbortSignal,fetcher:typeof fetch=fetch,
):Promise<CapturedRealityHybridMeshPayload> {
  signal.throwIfAborted()
  const headers=await requestHeaders()
  signal.throwIfAborted()
  const response=await fetcher(descriptor.url,{method:'GET',cache:'no-store',credentials:'omit',redirect:'error',headers,signal})
  if (!response.ok || response.status!==200 || response.headers.get('content-type')?.split(';')[0]!=='model/gltf-binary'
    || response.headers.get('x-urai-checksum-sha256')!==descriptor.meshSha256
    || response.headers.get('x-urai-storage-generation')!==descriptor.meshStorageGeneration
    || Number(response.headers.get('content-length'))!==descriptor.meshByteLength
    || response.headers.has('content-range') || (response.headers.get('content-encoding')??'identity')!=='identity') {
    await response.body?.cancel()
    throw new Error('PRIVATE_MESH_TRANSPORT_INVALID')
  }
  if (!response.body) throw new Error('PRIVATE_MESH_BODY_MISSING')
  const reader=response.body.getReader()
  const bytes=new Uint8Array(descriptor.meshByteLength)
  let used=0
  try {
    while(true) {
      signal.throwIfAborted()
      const {value,done}=await reader.read()
      if(done)break
      if(!value || used+value.byteLength>bytes.byteLength)throw new Error('PRIVATE_MESH_SIZE_CHANGED')
      bytes.set(value,used);used+=value.byteLength
    }
    if(used!==bytes.byteLength)throw new Error('PRIVATE_MESH_LENGTH_CHANGED')
    return {bytes,sha256:descriptor.meshSha256,registration:descriptor.registration}
  } finally {reader.releaseLock()}
}
