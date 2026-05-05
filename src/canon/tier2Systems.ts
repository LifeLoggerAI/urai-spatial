export type Tier2SystemDomain = {
  id: string
  label: string
  ownerRole: 'architecture' | 'privacy' | 'product' | 'platform'
  paths: string[]
}

export const tier2Systems: Tier2SystemDomain[] = [
  { id: 'storytime', label: 'Storytime', ownerRole: 'product', paths: ['src/components/life-map', 'src/app/replay'] },
  { id: 'spatial', label: 'Spatial', ownerRole: 'architecture', paths: ['src/spatial', 'src/app/spatial'] },
  { id: 'privacy', label: 'Privacy', ownerRole: 'privacy', paths: ['firebase/firestore.rules', 'src/app/api/entitlement'] },
  { id: 'admin', label: 'Admin', ownerRole: 'platform', paths: ['src/app/api', 'verification'] },
  { id: 'companion', label: 'Companion', ownerRole: 'product', paths: ['src/components/life-map/CompanionGuide.tsx'] },
  { id: 'memory', label: 'Memory', ownerRole: 'product', paths: ['src/lib/life-map', 'src/components/life-map'] },
]
