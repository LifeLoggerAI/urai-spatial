import type { ReactNode } from 'react'
import AssetSlot from './assets/AssetSlot'
import { worldAssetManifest } from './assets/worldAssetManifest'
import type { URAIWorldMode } from './state/worldModes'

type URAIWorldShellProps = {
  initialMode: URAIWorldMode
  children?: ReactNode
}

function PlaceholderObject({ label }: { label: string }) {
  return <span className="urai-world-placeholder-object">{label}</span>
}

export default function URAIWorldShell({ initialMode, children }: URAIWorldShellProps) {
  return (
    <main className="urai-world-shell" data-urai-world-mode={initialMode} data-urai-world-foundation="shared-shell-v1">
      <section className="urai-world-layer urai-world-home" aria-label="Home city overlook layer">
        <AssetSlot
          slotId={worldAssetManifest.home.overlookPlatform.slotId}
          finalModel={worldAssetManifest.home.overlookPlatform.finalModel}
          className="urai-world-slot"
          fallback={<PlaceholderObject label="Home platform slot" />}
        />
        <AssetSlot
          slotId={worldAssetManifest.home.skylineCore.slotId}
          finalModel={worldAssetManifest.home.skylineCore.finalModel}
          className="urai-world-slot"
          fallback={<PlaceholderObject label="Skyline model slot" />}
        />
      </section>

      <section className="urai-world-layer urai-world-ground" aria-label="Ground lower world layer">
        <AssetSlot
          slotId={worldAssetManifest.ground.lowerWorldLayer.slotId}
          finalModel={worldAssetManifest.ground.lowerWorldLayer.finalModel}
          className="urai-world-slot"
          fallback={<PlaceholderObject label="Ground lower layer slot" />}
        />
      </section>

      <section className="urai-world-layer urai-world-life-map" aria-label="Life Map sky layer">
        <AssetSlot
          slotId={worldAssetManifest.lifeMap.galaxyDome.slotId}
          finalModel={worldAssetManifest.lifeMap.galaxyDome.finalModel}
          className="urai-world-slot"
          fallback={<PlaceholderObject label="Life Map sky dome slot" />}
        />
        <AssetSlot
          slotId={worldAssetManifest.lifeMap.memoryStars.slotId}
          finalModel={worldAssetManifest.lifeMap.memoryStars.finalModel}
          className="urai-world-slot"
          fallback={<PlaceholderObject label="Memory stars slot" />}
        />
      </section>

      <section className="urai-world-layer urai-world-focus" aria-label="Focus selected star layer">
        <AssetSlot
          slotId={worldAssetManifest.focus.starPortalShell.slotId}
          finalModel={worldAssetManifest.focus.starPortalShell.finalModel}
          className="urai-world-slot"
          fallback={<PlaceholderObject label="Focus star portal slot" />}
        />
      </section>

      <section className="urai-world-layer urai-world-replay" aria-label="Replay memory depth layer">
        <AssetSlot
          slotId={worldAssetManifest.replay.memoryThreadTunnel.slotId}
          finalModel={worldAssetManifest.replay.memoryThreadTunnel.finalModel}
          className="urai-world-slot"
          fallback={<PlaceholderObject label="Replay tunnel slot" />}
        />
      </section>

      <section className="urai-world-layer urai-world-passport" aria-label="Passport vault layer">
        <AssetSlot
          slotId={worldAssetManifest.passport.identityVault.slotId}
          finalModel={worldAssetManifest.passport.identityVault.finalModel}
          className="urai-world-slot"
          fallback={<PlaceholderObject label="Passport vault slot" />}
        />
      </section>

      <section className="urai-world-layer urai-world-status" aria-label="Status beacon layer">
        <AssetSlot
          slotId={worldAssetManifest.status.beaconTower.slotId}
          finalModel={worldAssetManifest.status.beaconTower.finalModel}
          className="urai-world-slot"
          fallback={<PlaceholderObject label="Status beacon slot" />}
        />
      </section>

      <aside className="urai-world-overlay" aria-label="Spatial overlay placeholder">
        <strong>URAI shared world shell</strong>
        <span>{initialMode}</span>
      </aside>

      {children}

      <style jsx>{`
        .urai-world-shell{position:relative;min-height:100svh;overflow:hidden;background:#020611;color:#eef6ff;isolation:isolate}
        .urai-world-layer{position:absolute;inset:0;display:grid;place-items:center;pointer-events:none}
        .urai-world-home{z-index:4}.urai-world-ground{z-index:2;transform:translateY(28%);opacity:.45}.urai-world-life-map{z-index:3;transform:translateY(-24%);opacity:.55}.urai-world-focus,.urai-world-replay,.urai-world-passport,.urai-world-status{z-index:5;opacity:.18}
        .urai-world-slot{display:inline-grid;place-items:center;min-width:180px;min-height:72px;border:1px solid rgba(160,220,255,.22);border-radius:24px;background:rgba(2,8,24,.5);box-shadow:0 24px 80px rgba(0,0,0,.35);backdrop-filter:blur(16px)}
        .urai-world-placeholder-object{font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:rgba(238,246,255,.82)}
        .urai-world-overlay{position:absolute;right:18px;top:18px;z-index:20;display:grid;gap:3px;padding:10px 12px;border:1px solid rgba(160,220,255,.18);border-radius:16px;background:rgba(2,8,24,.58);backdrop-filter:blur(16px)}
        .urai-world-overlay strong{font-size:11px;letter-spacing:.14em;text-transform:uppercase}.urai-world-overlay span{font-size:12px;color:rgba(238,246,255,.68)}
      `}</style>
    </main>
  )
}
