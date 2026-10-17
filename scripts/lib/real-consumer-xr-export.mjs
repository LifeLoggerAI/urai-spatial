// Validate actual exported XR bytes against the current source-controlled
// release authority. A non-immersive preview is not a certified XR session.
import {
  conditionalXrRoutes,
  currentXrReleaseAuthority,
  expectedConditionalXrStatus,
  inspectConditionalXrResponse,
} from './xr-release-authority.mjs'

const XR_PREVIEW='/spatial/ar-vr'
const XR_IMMERSIVE='/xr'
const previewUrl='https://urai.app/spatial/ar-vr'
const htmlNames=route=>[route.slice(1)+'/index.html',route.slice(1)+'.html']

function fails(reason) {
  throw new Error('Unsafe compiled XR export: '+reason)
}

export function verifyRealConsumerXrExport({
  boundary, files, readHtml, authority=currentXrReleaseAuthority(),
}) {
  if(!boundary||!Array.isArray(boundary.routes)||
     !Array.isArray(files)||typeof readHtml!=='function') fails('missing evidence')
  if(boundary.routes.length!==conditionalXrRoutes.length||
    new Set(boundary.routes.map(x=>x.route)).size!==conditionalXrRoutes.length) {
    fails('incomplete or duplicate route authority')
  }
  const names=new Set(files.map(x=>typeof x==='string'?x:x.path))
  for(const route of conditionalXrRoutes) {
    const entry=boundary.routes.find(x=>x.route===route)
    if(!entry||typeof entry.enabled!=='boolean'||
      entry.enabled!==authority.enabled||
      entry.expectedStatus!==expectedConditionalXrStatus(route,authority)||
      entry.previewOnly!==(route===XR_PREVIEW&&!entry.enabled)) {
      fails('source authority disagrees with compiled boundary: '+route)
    }
    if(entry.enabled) continue // Still requires separate device/release acceptance.
    const p=route.slice(1)
    if(route===XR_IMMERSIVE) {
      for(const file of [...htmlNames(route),p+'/index.txt',p+'.txt']) {
        if(names.has(file)) fails('disabled immersive XR route exposed: '+file)
      }
      continue
    }
    const present=htmlNames(route).filter(name=>names.has(name))
    if(present.length===0) fails('missing authorized technical preview: '+route)
    for(const name of present) {
      const html=readHtml(name)
      if(typeof html!=='string'||html.length===0||
        !inspectConditionalXrResponse({status:200,url:previewUrl},previewUrl,authority,html)) {
        fails('preview identity/status/disabled copy mismatch: '+name)
      }
      // Read the physical SSR main tag, not merely a declared receipt.
      const world=html.match(/<main\b[^>]*\bdata-testid=["']urai-quest-explorable-world["'][^>]*>/)?.[0]
      if(!world||!/\bdata-immersive-session-gated=["']true["']/.test(world)) {
        fails('XR world is not explicitly gated: '+name)
      }
      // The Quest entry and headset consent must both be inert when the
      // source release boundary is disabled, even if the preview can navigate.
      const control=html.indexOf('data-testid="urai-quest-vr-entry-control"')
      const consent=control>=0?html.slice(control,control+7500):''
      const button=[...consent.matchAll(/<button\b([^>]*)>\s*Enter VR in Quest\s*<\/button>/g)]
      if(button.length!==1||!/\bdisabled(?:\s|=|$)/.test(button[0][1])) {
        fails('immersive Quest button not provably disabled: '+name)
      }
      const checkbox=consent.match(/<input\b[^>]*\btype=["']checkbox["'][^>]*>/)?.[0]
      if(!checkbox||!/\bdisabled(?:\s|=|>)/.test(checkbox)) {
        fails('immersive-session consent control not disabled: '+name)
      }
    }
  }
  return {immersiveRouteRemoved:true,technicalPreviewVerified:!authority.enabled,
    deviceAcceptance:false,releaseAuthorized:false}
}
