
export const starData = Array.from({ length: 140 }, (_, i) => {
    const radius = 10
    const theta = (i / 140) * Math.PI * 2
    const phi = (i * 1.618) % Math.PI
    const x = radius * Math.cos(theta) * Math.sin(phi)
    const y = radius * Math.sin(theta) * Math.sin(phi)
    const z = radius * Math.cos(phi)
    return {
      id: i.toString(),
      position: [x, y, z] as [number, number, number],
      size: 0.02 + (i % 5) * 0.004
    }
})
