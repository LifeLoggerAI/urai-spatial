export function kelvinToRGB(k:number){

  k = k/100

  let r,g,b

  r = k <= 66
    ? 255
    : 329.698727446*Math.pow(k-60,-0.1332047592)

  g = k <= 66
    ? 99.4708025861*Math.log(k)-161.1195681661
    : 288.1221695283*Math.pow(k-60,-0.0755148492)

  b = k >= 66
    ? 255
    : k <= 19
    ? 0
    : 138.5177312231*Math.log(k-10)-305.0447927307

  return [
    Math.min(255,Math.max(0,r))/255,
    Math.min(255,Math.max(0,g))/255,
    Math.min(255,Math.max(0,b))/255
  ]
}
