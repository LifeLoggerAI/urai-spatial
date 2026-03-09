export type Star = {
  id:number
  position:[number,number,number]
}

function mulberry32(a:number){
  return function(){
    let t=a+=0x6D2B79F5
    t=Math.imul(t^t>>>15,t|1)
    t^=t+Math.imul(t^t>>>7,t|61)
    return((t^t>>>14)>>>0)/4294967296
  }
}

export function generateStars(count=800):Star[]{
  const rand = mulberry32(1337)
  const stars:Star[]=[]

  for(let i=0;i<count;i++){
    stars.push({
      id:i,
      position:[
        (rand()-0.5)*200,
        (rand()-0.5)*200,
        (rand()-0.5)*200
      ]
    })
  }

  return stars
}

export const STAR_DATA = generateStars()
