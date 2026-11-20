// Fail-closed nonproduction identity guard for hosted ONE URAI review builds.
const read = (e,k) => String(e[k] ?? '').trim()
const required=['NEXT_PUBLIC_FIREBASE_API_KEY','NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN','NEXT_PUBLIC_FIREBASE_PROJECT_ID','NEXT_PUBLIC_FIREBASE_APP_ID','NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET']
export function assertReviewFirebaseBoundary(env=process.env) {
  const markedPreview = read(env,'VERCEL_ENV')==='preview' || read(env,'NEXT_PUBLIC_URAI_PREVIEW_MODE')==='true'
  if(markedPreview && read(env,'URAI_REVIEW_ONLY')!=='true')throw Error('URAI_PREVIEW_REVIEW_MODE_REQUIRED')
  if(read(env,'URAI_REVIEW_ONLY')!=='true')return 'outside-review'
  if(read(env,'URAI_PRIVATE_MEMORY_WRITES_ENABLED')!=='false')throw Error('URAI_REVIEW_WRITES_MUST_BE_OFF')
  const configured=required.filter(k=>read(env,k))
  if(!configured.length)return 'review-no-firebase'
  if(configured.length!==required.length)throw Error('URAI_REVIEW_PARTIAL_FIREBASE_CONFIG')
  const id=read(env,'NEXT_PUBLIC_FIREBASE_PROJECT_ID')
  if(!/^[a-z][a-z0-9-]{4,35}$/.test(id)||id.startsWith('demo-')||['urai-4dc1d','urai-local','urai-privacy-r1512-disposable'].includes(id))throw Error('URAI_REVIEW_UNSAFE_FIREBASE_PROJECT')
  if(id!==read(env,'URAI_APPROVED_STAGING_FIREBASE_PROJECT_ID'))throw Error('URAI_REVIEW_STAGING_PROJECT_NOT_APPROVED')
  const domain=read(env,'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN')
  if(domain!==read(env,'URAI_APPROVED_STAGING_FIREBASE_AUTH_DOMAIN')||![id+'.firebaseapp.com',id+'.web.app'].includes(domain))throw Error('URAI_REVIEW_STAGING_AUTH_DOMAIN_MISMATCH')
  if(![id+'.appspot.com',id+'.firebasestorage.app'].includes(read(env,'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET')))throw Error('URAI_REVIEW_STAGING_STORAGE_BUCKET_MISMATCH')
  return 'staging-config-matched-not-certified'
}
