export type StarPosition = {
  id:number
  position:[number,number,number]
}

function mulberry32(a:number){
  return function(){
    var t = a += 0x6D2B79F5
    t = Math.imul(t ^ t >>> 15, t | 1)
    t ^= t + Math.imul(t ^ t >>> 7, t | 61)
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

export function generateStarPositions(
  seed:number = 42,
  count:number = 20
):StarPosition[]{

  const rand = mulberry32(seed)

  const stars:StarPosition[] = []

  for(let i=0;i<count;i++){

    const x = (rand() - 0.5) * 20
    const y = (rand() - 0.5) * 14
    const z = -5 - rand() * 6

    stars.push({
      id:i,
      position:[x,y,z]
    })
  }

  return stars
}
