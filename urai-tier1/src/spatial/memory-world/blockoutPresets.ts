import type { MemoryWorld } from './memoryWorld'

export const MEMORY_WORLD_BLOCKOUT_PRESET_VERSION = 'urai-memory-world-blockout-1' as const

export type MemoryWorldBlockoutProp = {
  id: string
  semanticTag: string
  position: [number, number, number]
  size: [number, number, number]
  materialClass: 'wood' | 'fabric' | 'metal' | 'glass' | 'stone' | 'vegetation' | 'painted'
}

export type MemoryWorldBlockoutPreset = {
  id: string
  label: string
  archetypeId: string
  eraPackId?: string
  environment: 'interior' | 'outdoor' | 'vehicle'
  status: 'blockout'
  floorColor: string
  wallColor: string
  props: readonly MemoryWorldBlockoutProp[]
}

const p = (id:string,semanticTag:string,position:[number,number,number],size:[number,number,number],materialClass:MemoryWorldBlockoutProp['materialClass']):MemoryWorldBlockoutProp => ({id,semanticTag,position,size,materialClass})

export const MEMORY_WORLD_BLOCKOUT_PRESETS: readonly MemoryWorldBlockoutPreset[] = [
  {id:'blockout:modern-living-room',label:'Modern living room',archetypeId:'scene:residential:living-room',eraPackId:'era:2020s',environment:'interior',floorColor:'#5a5147',wallColor:'#d8d1c6',status:'blockout',props:[p('sofa','seating:sofa',[-2,-.45,-3],[2.8,.8,1.1],'fabric'),p('table','table:coffee',[0,-.7,-3],[1.8,.35,1.1],'wood'),p('media','media:television',[2.8,.1,-6],[1.8,1.1,.18],'glass')]},
  {id:'blockout:1990s-living-room',label:'1990s living room',archetypeId:'scene:residential:living-room',eraPackId:'era:1990s',environment:'interior',floorColor:'#725b43',wallColor:'#b99f7d',status:'blockout',props:[p('sofa','seating:sofa',[-2,-.45,-3],[3,.85,1.15],'fabric'),p('crt','media:crt-television',[2.6,-.15,-5.6],[1.7,1.45,.9],'glass'),p('side-table','table:side',[1.2,-.65,-2.4],[.8,.5,.8],'wood')]},
  {id:'blockout:modern-kitchen',label:'Modern kitchen',archetypeId:'scene:residential:kitchen',eraPackId:'era:2020s',environment:'interior',floorColor:'#5e6261',wallColor:'#e8e5df',status:'blockout',props:[p('island','counter:kitchen-island',[0,-.35,-3.4],[3.1,1.05,1.15],'stone'),p('fridge','appliance:refrigerator',[-3.2,.25,-5.8],[1.25,2.45,.9],'metal'),p('range','appliance:range',[2.8,-.2,-5.85],[1.35,1.15,.75],'metal')]},
  {id:'blockout:1990s-kitchen',label:'1990s family kitchen',archetypeId:'scene:residential:kitchen',eraPackId:'era:1990s',environment:'interior',floorColor:'#8b765d',wallColor:'#d0b992',status:'blockout',props:[p('table','table:dining',[0,-.55,-3],[2.4,.7,1.45],'wood'),p('fridge','appliance:refrigerator',[-3.2,.2,-5.8],[1.15,2.3,.85],'metal'),p('crt','media:crt-television',[2.6,-.25,-5.75],[1.25,1.05,.65],'glass')]},
  {id:'blockout:childhood-bedroom',label:'Childhood bedroom',archetypeId:'scene:residential:child-bedroom',environment:'interior',floorColor:'#6f6255',wallColor:'#aac0cf',status:'blockout',props:[p('bed','furniture:bed',[-2,-.55,-4.2],[2.3,.65,1.25],'fabric'),p('dresser','storage:dresser',[2.5,-.25,-5.7],[1.6,1.25,.65],'wood'),p('toy-bin','storage:toy-bin',[1,-.65,-2.7],[1,.55,.8],'painted')]},
  {id:'blockout:grandparents-home',label:"Grandparents' home",archetypeId:'scene:childhood:grandparents-home',environment:'interior',floorColor:'#765f47',wallColor:'#c8b18e',status:'blockout',props:[p('sofa','seating:sofa',[-2,-.45,-3.2],[2.8,.8,1.1],'fabric'),p('display','storage:display-cabinet',[2.9,.1,-5.7],[1.45,2.1,.55],'wood'),p('table','table:side',[.8,-.65,-2.5],[.9,.5,.9],'wood')]},
  {id:'blockout:backyard',label:'Backyard',archetypeId:'scene:residential:home-yard',environment:'outdoor',floorColor:'#526846',wallColor:'#8194a2',status:'blockout',props:[p('tree-a','vegetation:tree',[-4,1.4,-7],[1.4,4.2,1.4],'vegetation'),p('tree-b','vegetation:tree',[4,1.2,-9],[1.2,3.8,1.2],'vegetation'),p('patio','structure:patio',[0,-.85,-2.8],[4,.2,2.5],'stone')]},
  {id:'blockout:neighborhood-street',label:'Neighborhood street',archetypeId:'scene:communityCivicRetail:neighborhood-street',environment:'outdoor',floorColor:'#343a3e',wallColor:'#8ba0ad',status:'blockout',props:[p('house-a','structure:house',[-4,.2,-9],[3,2.3,2.3],'painted'),p('house-b','structure:house',[4,.2,-10],[3,2.3,2.3],'painted'),p('tree','vegetation:tree',[0,1.2,-7],[1.2,3.8,1.2],'vegetation')]},
  {id:'blockout:classroom',label:'Classroom',archetypeId:'scene:education:secondary-classroom',environment:'interior',floorColor:'#706c62',wallColor:'#dad5c8',status:'blockout',props:[p('desk-a','furniture:student-desk',[-2,-.55,-3],[1.1,.65,.7],'wood'),p('desk-b','furniture:student-desk',[0,-.55,-3],[1.1,.65,.7],'wood'),p('desk-c','furniture:student-desk',[2,-.55,-3],[1.1,.65,.7],'wood'),p('board','fixture:board',[0,.9,-6.85],[4,1.6,.08],'painted')]},
  {id:'blockout:office',label:'Office',archetypeId:'scene:work:private-office',environment:'interior',floorColor:'#4d5358',wallColor:'#cfd3d4',status:'blockout',props:[p('desk','furniture:desk',[0,-.45,-3.8],[2.4,.75,1],'wood'),p('chair','seating:office-chair',[0,-.45,-2.3],[.9,1,.9],'fabric'),p('shelf','storage:bookshelf',[3,.1,-5.8],[1.5,2.1,.45],'wood')]},
  {id:'blockout:hospital-room',label:'Hospital room',archetypeId:'scene:healthcare:hospital-room',environment:'interior',floorColor:'#8d9798',wallColor:'#e4eceb',status:'blockout',props:[p('bed','medical:hospital-bed',[-1,-.35,-4],[2.4,.8,1.05],'metal'),p('monitor','medical:monitor',[2,.3,-4.8],[.65,1.6,.55],'metal'),p('chair','seating:visitor-chair',[2,-.55,-2.7],[.8,.85,.8],'fabric')]},
  {id:'blockout:market',label:'Market / store',archetypeId:'scene:communityCivicRetail:open-market',environment:'outdoor',floorColor:'#665b4d',wallColor:'#9aa6aa',status:'blockout',props:[p('stall-a','retail:stall',[-2,-.15,-5],[2.4,1.5,1.4],'wood'),p('stall-b','retail:stall',[2.2,-.15,-6],[2.4,1.5,1.4],'wood'),p('aisle','navigation:aisle',[0,-.82,-2.5],[3,.1,6],'stone')]},
  {id:'blockout:cafe',label:'Cafe / restaurant',archetypeId:'scene:foodHospitality:cafe',environment:'interior',floorColor:'#5e4d42',wallColor:'#c7b9a6',status:'blockout',props:[p('table-a','table:dining',[-2,-.55,-3.3],[1.2,.7,1.2],'wood'),p('table-b','table:dining',[1.7,-.55,-4],[1.2,.7,1.2],'wood'),p('counter','counter:service',[0,-.25,-6],[4,1.2,.8],'wood')]},
  {id:'blockout:car-interior',label:'Car interior',archetypeId:'scene:everydayTransitional:back-seat-car',environment:'vehicle',floorColor:'#25282c',wallColor:'#3d434a',status:'blockout',props:[p('front-seats','seating:front-seats',[0,-.15,-2.3],[2.6,1.6,.8],'fabric'),p('rear-seat','seating:rear-bench',[0,-.4,1],[3,1,.9],'fabric'),p('dash','vehicle:dashboard',[0,.2,-4],[3.2,.7,.55],'painted')]},
  {id:'blockout:park-forest',label:'Park / forest',archetypeId:'scene:nature:woodland',environment:'outdoor',floorColor:'#40533d',wallColor:'#708895',status:'blockout',props:[p('tree-a','vegetation:tree',[-4,1.6,-6],[1.3,4.8,1.3],'vegetation'),p('tree-b','vegetation:tree',[3,1.5,-8],[1.2,4.5,1.2],'vegetation'),p('tree-c','vegetation:tree',[6,1.7,-12],[1.5,5,1.5],'vegetation'),p('path','navigation:path',[0,-.8,-5],[2,.1,12],'stone')]},
]

export function blockoutPresetForWorld(world: MemoryWorld) {
  const exact = MEMORY_WORLD_BLOCKOUT_PRESETS.find((preset) =>
    preset.archetypeId === world.archetypeId
    && (!preset.eraPackId || preset.eraPackId === world.context.eraPackId),
  )
  return exact ?? MEMORY_WORLD_BLOCKOUT_PRESETS.find((preset) => preset.archetypeId === world.archetypeId) ?? null
}
