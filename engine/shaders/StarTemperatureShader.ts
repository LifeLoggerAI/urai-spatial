export function temperatureToColor(k:number){

  /* convert Kelvin to scale used by approximation */
  let t = k / 100

  let r:number
  let g:number
  let b:number

  /* RED */

  if(t <= 66){
    r = 255
  } else {
    r = 329.698727446 * Math.pow(t - 60, -0.1332047592)
  }

  /* GREEN */

  if(t <= 66){
    g = 99.4708025861 * Math.log(Math.max(t,1)) - 161.1195681661
  } else {
    g = 288.1221695283 * Math.pow(t - 60, -0.0755148492)
  }

  /* BLUE */

  if(t >= 66){
    b = 255
  } else if(t <= 19){
    b = 0
  } else {
    b = 138.5177312231 * Math.log(t - 10) - 305.0447927307
  }

  /* clamp to valid RGB range */

  r = Math.min(255, Math.max(0, r))
  g = Math.min(255, Math.max(0, g))
  b = Math.min(255, Math.max(0, b))

  /* normalize for shaders / THREE.Color */

  return [r/255, g/255, b/255]
}