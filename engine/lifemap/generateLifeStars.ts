export type LifeStar = {
  id:number
  position:[number,number,number]
  year:number
}

function mulberry32(a:number){
  return function(){
    var t = a += 0x6D2B79F5
    t = Math.imul(t ^ t >>> 15, t | 1)
    t ^= t + Math.imul(t ^ t >>> 7, t | 61)
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

export function generateLifeStars(
  seed:number = 42,
  count:number = 1500
):LifeStar[]{

  const rand = mulberry32(seed)

  const stars:LifeStar[] = []

  for(let i=0;i<count;i++){

    const angle = rand()*Math.PI*2
    const radius = 20 + rand()*120

    const x = Math.cos(angle)*radius
    const y = (rand()-0.5)*40
    const z = -rand()*200

    stars.push({
      id:i,
      position:[x,y,z],
      year:1980 + Math.floor(rand()*50)
    })

  }

  return stars
}
