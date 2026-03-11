export function mulberry32(a:number){
  return function(){
    let t=a+=0x6D2B79F5
    t=Math.imul(t^t>>>15,t|1)
    t^=t+Math.imul(t^t>>>7,t|61)
    return((t^t>>>14)>>>0)/4294967296
  }
}

export function generateStarPosition(seed:number,timestamp:number){

  const rand=mulberry32(seed)

  const baseTime=1710000000
  const secondsPerYear=31536000

  const years=(timestamp-baseTime)/secondsPerYear

  const radius=3+years*1.2+(rand()-0.5)*2

  const theta=rand()*Math.PI*2

  const x=radius*Math.cos(theta)
  const y=radius*Math.sin(theta)

  const z=-5+(rand()-0.5)*0.5

  return [x,y,z] as [number,number,number]
}
