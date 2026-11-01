/** Derive seven real-video segments from timestamped events in one browser page. */
// Every segment must cover the existing 30-second Day 1 editorial cut with
// 250 ms of actual recorded motion margin (no freeze-frame padding).
const DEFINITIONS = Object.freeze([
  ['home','home','home-first-person',4.25],
  ['orb','return-home','orb-end',3.25],
  ['ascent','home-first-person','life-map-overview',4.25],
  ['life-map','life-map-overview','focus',5.25],
  ['focus','focus','replay',3.25],
  ['replay','replay','replay-playback-end',3.25],
  ['return','replay-playback-end','return-home',4.25],
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
