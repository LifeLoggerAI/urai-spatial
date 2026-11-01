/** Derive seven real-video segments from timestamped events in one browser page. */
const DEFINITIONS = Object.freeze([
  ['home','home','home-first-person',2.5],
  ['orb','return-home','orb-end',2.0],
  ['ascent','home-first-person','life-map-overview',2.0],
  ['life-map','life-map-overview','focus',2.5],
  ['focus','focus','replay',2.0],
  ['replay','replay','replay-playback-end',3.0],
  ['return','replay-playback-end','return-home',2.0],
])
export function segmentsFromEvents(events) {
  if (!Array.isArray(events)) throw Error('INVALID_SOURCE_JOURNEY_EVENTS')
  const observed=new Set()
  let prior=-1
  for(const event of events){
    if (!event || typeof event.id!=='string' || !Number.isFinite(event.ms) || event.ms < prior) throw Error('NONMONOTONIC_SOURCE_JOURNEY_EVENTS')
    if(observed.has(event.id))throw Error(`DUPLICATE_SOURCE_JOURNEY_CHECKPOINT:${event.id}`)
    observed.add(event.id);prior=event.ms
  }
  const get=id=>{
    const event=events.find(x=>x.id===id)
    if(!event)throw Error(`REQUIRED_REAL_JOURNEY_CHECKPOINT_MISSING:${id}`)
    return event.ms/1000
  }
  return DEFINITIONS.map(([name,start,end,min])=>{
    const a=get(start),b=get(end),duration=b-a
    if(!(duration>=min))throw Error(`INSUFFICIENT_SOURCE_JOURNEY_DURATION:${name}:${duration}`)
    return {name,sourceStartSeconds:+a.toFixed(3),sourceEndSeconds:+b.toFixed(3),sourceDurationSeconds:+duration.toFixed(3),sourceCheckpointStart:start,sourceCheckpointEnd:end}
  })
}
