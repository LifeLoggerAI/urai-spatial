import { LifeChapter, LifeMapEdge, LifeMapNode } from './lifeMapTypes'
const now = new Date().toISOString()
const mkNode = (i:number, type:LifeMapNode['nodeType'], tone:LifeMapNode['emotionalTone']): LifeMapNode => ({
  id:`n-${i}`,userId:'demo-user',title:`${type} ${i}`,subtitle:'Symbolic moment',description:'A vivid emotional waypoint in your life constellation.',timestamp:new Date(2010+i, i%12, 1).toISOString(),nodeType:type,emotionalTone:tone,emotionalIntensity:0.45+((i%6)*0.1),auraColor:({calm:'#9ec5ff',clarity:'#dbeafe',purpose:'#fbbf24',dreamy:'#a78bfa',pain:'#f97316',healing:'#34d399',rebirth:'#f8fafc',shadow:'#312e81'} as any)[tone],glyphType:['✦','◉','☽','✶','⬡'][i%5],chapterId:`c-${(i%4)+1}`,season:(['spring','summer','autumn','winter'] as const)[i%4],importanceScore:0.2+(i%10)/10,privacyLevel:(['private','trusted','public'] as const)[i%3],x:(i*73)%900,y:(i*47)%640,z:i%9,clusterId:`cluster-${i%6}`,relatedPeople:[`Person ${(i%5)+1}`],relatedLocations:[`Place ${(i%6)+1}`],relatedTags:['growth','memory',type],sourceSignals:['journal','mood','location'],replayScript:['zoom-in','aura-bloom'],narratorLine:'You were changing shape in this season.',visualState:'active',isMilestone:type==='milestone',isShadow:type==='shadow',isRecovery:type==='recovery',isDream:type==='dream',isRelationship:type==='relationship',isRitual:type==='ritual',createdAt:now,updatedAt:now
})

export const demoNodes: LifeMapNode[] = [
  ...Array.from({length:20},(_,i)=>mkNode(i+1,'memory','calm')),
  ...Array.from({length:5},(_,i)=>mkNode(i+21,'insight','purpose')),
  ...Array.from({length:5},(_,i)=>mkNode(i+26,'relationship','clarity')),
  ...Array.from({length:5},(_,i)=>mkNode(i+31,'recovery','healing')),
  ...Array.from({length:5},(_,i)=>mkNode(i+36,'dream','dreamy')),
  ...Array.from({length:5},(_,i)=>mkNode(i+41,'shadow','shadow')),
  ...Array.from({length:3},(_,i)=>mkNode(i+46,'ritual','rebirth')),
]

export const demoEdges: LifeMapEdge[] = demoNodes.slice(1,35).map((n,idx)=>({id:`e-${idx+1}`,sourceId:demoNodes[idx].id,targetId:n.id,strength:0.35+((idx%5)*0.12),type:(['constellation','recovery','dream','relationship','shadow'] as const)[idx%5]}))

export const demoChapters: LifeChapter[] = [1,2,3,4].map((n)=>({id:`c-${n}`,title:['The Season of Becoming','The Quiet Winter','The Breakthrough Year','The Return to Self'][n-1],summary:'A chapter where identity, resilience, and purpose took a visible shape.',dominantEmotions:['calm','purpose','healing'],keyNodeIds:demoNodes.filter(x=>x.chapterId===`c-${n}`).slice(0,5).map(x=>x.id),coverAura:['#60a5fa','#312e81','#f59e0b','#34d399'][n-1],eraStart:new Date(2010+(n-1)*3,0,1).toISOString(),eraEnd:new Date(2012+(n-1)*3,11,1).toISOString(),narratorVoiceover:'This chapter held both friction and emergence.'}))

export const mirrorReplayPath = demoNodes.slice(0,14).map((n, i)=>({nodeId:n.id,holdMs:1000+(i*80),zoom:1.2+(i*0.05),weather:(['fog','rain','wind','aurora','sunrise'] as const)[i%5]}))
