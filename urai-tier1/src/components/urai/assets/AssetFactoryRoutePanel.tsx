import { getUraiAssetRuntimePath, getUraiRouteAssets } from '@/lib/uraiAssetFactory'

type AssetFactoryRoutePanelProps = {
  route: string
  title?: string
}

export function AssetFactoryRoutePanel({ route, title = 'Launch Asset Pipeline' }: AssetFactoryRoutePanelProps) {
  const assets = getUraiRouteAssets(route)
  const ready = assets.filter((asset) => asset.status === 'ready').length
  const placeholders = assets.filter((asset) => asset.status === 'placeholder').length
  const missing = assets.filter((asset) => !getUraiAssetRuntimePath(asset)).length

  return (
    <section aria-label={`${title} route assets`} style={{ position: 'relative', zIndex: 20, padding: '16px', color: '#eef6ff' }}>
      <div
        style={{
          maxWidth: 1180,
          margin: '0 auto',
          border: '1px solid rgba(155, 231, 255, 0.18)',
          borderRadius: 24,
          background: 'rgba(2, 8, 23, 0.72)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.32)',
          backdropFilter: 'blur(18px)',
          padding: 16,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <p style={{ margin: 0, color: 'rgba(186,230,253,0.72)', fontSize: 10, fontWeight: 900, letterSpacing: '0.24em', textTransform: 'uppercase' }}>{title}</p>
            <h2 style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 900, letterSpacing: '-0.04em' }}>{route} world asset slots</h2>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 10, fontWeight: 900, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
            <span>{ready} ready</span>
            <span>{placeholders} placeholder</span>
            <span>{missing} missing</span>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginTop: 14 }}>
          {assets.map((asset) => (
            <article key={asset.asset_id} style={{ border: '1px solid rgba(255,255,255,0.10)', borderRadius: 18, background: 'rgba(255,255,255,0.045)', padding: 12 }}>
              <strong style={{ display: 'block', fontSize: 13 }}>{asset.name}</strong>
              <span style={{ display: 'block', marginTop: 4, color: 'rgba(186,230,253,0.62)', fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase' }}>{asset.status}</span>
              <p style={{ margin: '8px 0 0', color: 'rgba(238,246,255,0.64)', fontSize: 12, lineHeight: 1.45 }}>{asset.purpose}</p>
              <p style={{ margin: '8px 0 0', color: 'rgba(186,230,253,0.48)', fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Runtime: {getUraiAssetRuntimePath(asset) ?? 'none'}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
