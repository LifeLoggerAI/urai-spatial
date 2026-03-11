export const lifeDataset = []

const YEARS = 80
const STARS_PER_YEAR = 40

let id = 0

for(let year=0; year<YEARS; year++){

  for(let i=0;i<STARS_PER_YEAR;i++){

    const radius = Math.random()*2.5

    const angle = Math.random()*Math.PI*2

    const x = Math.cos(angle)*radius
    const y = Math.sin(angle)*radius

    const z = -year*2

    lifeDataset.push({
      id:id++,
      year,
      position:[x,y,z]
    })

  }

}
