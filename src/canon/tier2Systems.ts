export type Tier2SystemDomain = {
  id: string
  label: string
  ownerRole: 'architecture' | 'privacy' | 'product' | 'platform'
  paths: string[]
}

export const tier2Systems: Tier2SystemDomain[] = [
  { id: 'storytime', label: 'Storytime', ownerRole: 'product', paths: ['urai-tier1/src/components/lifemap', 'urai-tier1/src/app/replay'] },
  { id: 'spatial', label: 'Spatial', ownerRole: 'architecture', paths: ['urai-tier1/src/spatial', 'urai-tier1/src/app/spatial'] },
  { id: 'privacy', label: 'Privacy', ownerRole: 'privacy', paths: ['firebase/firestore.rules', 'urai-tier1/src/app/privacy-controls'] },
  { id: 'admin', label: 'Admin', ownerRole: 'platform', paths: ['apps/functions/src', 'verification'] },
  { id: 'companion', label: 'Companion', ownerRole: 'product', paths: ['urai-tier1/src/spatial/assets/uraiAssets.ts', 'urai-tier1/src/app/FinalMemorySurfaces.tsx'] },
  { id: 'memory', label: 'Memory', ownerRole: 'product', paths: ['urai-tier1/src/lib', 'urai-tier1/src/components/lifemap'] },
]
