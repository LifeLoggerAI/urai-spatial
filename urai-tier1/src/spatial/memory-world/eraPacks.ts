export const MEMORY_WORLD_ERA_PACK_VERSION = 'urai-memory-world-era-1' as const

export type MemoryWorldEraPack = {
  id: string
  label: string
  startsAt?: string
  endsAt?: string
  requiredDimensions: readonly [
    'furniture',
    'appliances-electronics',
    'lighting',
    'wall-finishes',
    'flooring',
    'vehicles',
    'packaging',
    'toys',
    'media',
    'signage-typography',
    'clothing',
    'telephony',
    'computing',
    'tools',
    'public-infrastructure',
  ]
}

const dimensions: MemoryWorldEraPack['requiredDimensions'] = [
  'furniture',
  'appliances-electronics',
  'lighting',
  'wall-finishes',
  'flooring',
  'vehicles',
  'packaging',
  'toys',
  'media',
  'signage-typography',
  'clothing',
  'telephony',
  'computing',
  'tools',
  'public-infrastructure',
]

export const MEMORY_WORLD_ERA_PACKS: readonly MemoryWorldEraPack[] = [
  { id:'era:pre-1900', label:'Pre-1900', endsAt:'1899-12-31', requiredDimensions:dimensions },
  { id:'era:1900s', label:'1900s', startsAt:'1900-01-01', endsAt:'1909-12-31', requiredDimensions:dimensions },
  { id:'era:1910s', label:'1910s', startsAt:'1910-01-01', endsAt:'1919-12-31', requiredDimensions:dimensions },
  { id:'era:1920s', label:'1920s', startsAt:'1920-01-01', endsAt:'1929-12-31', requiredDimensions:dimensions },
  { id:'era:1930s', label:'1930s', startsAt:'1930-01-01', endsAt:'1939-12-31', requiredDimensions:dimensions },
  { id:'era:1940s', label:'1940s', startsAt:'1940-01-01', endsAt:'1949-12-31', requiredDimensions:dimensions },
  { id:'era:1950s', label:'1950s', startsAt:'1950-01-01', endsAt:'1959-12-31', requiredDimensions:dimensions },
  { id:'era:1960s', label:'1960s', startsAt:'1960-01-01', endsAt:'1969-12-31', requiredDimensions:dimensions },
  { id:'era:1970s', label:'1970s', startsAt:'1970-01-01', endsAt:'1979-12-31', requiredDimensions:dimensions },
  { id:'era:1980s', label:'1980s', startsAt:'1980-01-01', endsAt:'1989-12-31', requiredDimensions:dimensions },
  { id:'era:1990s', label:'1990s', startsAt:'1990-01-01', endsAt:'1999-12-31', requiredDimensions:dimensions },
  { id:'era:2000s', label:'2000s', startsAt:'2000-01-01', endsAt:'2009-12-31', requiredDimensions:dimensions },
  { id:'era:2010s', label:'2010s', startsAt:'2010-01-01', endsAt:'2019-12-31', requiredDimensions:dimensions },
  { id:'era:2020s', label:'2020s', startsAt:'2020-01-01', endsAt:'2029-12-31', requiredDimensions:dimensions },
]

export function memoryWorldEraPack(id: string) {
  return MEMORY_WORLD_ERA_PACKS.find((pack) => pack.id === id) ?? null
}
