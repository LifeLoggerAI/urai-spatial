fragmentShader: `

uniform sampler2D map;
uniform float uIntensity;
uniform float uHalo;

varying vec3 vColor;
varying float vTemp;
varying float vDist;

vec3 kelvinToRGB(float temp){

  temp = clamp(temp,1000.0,40000.0);
  float t = temp / 100.0;

  float r;
  float g;
  float b;

  if(t <= 66.0){
    r = 1.0;
    g = clamp(0.3900815787 * log(max(t,1.0)) - 0.6318414438,0.0,1.0);
  }else{
    r = clamp(1.292936186 * pow(t - 60.0,-0.1332047592),0.0,1.0);
    g = clamp(1.129890861 * pow(t - 60.0,-0.0755148492),0.0,1.0);
  }

  if(t >= 66.0){
    b = 1.0;
  }else if(t <= 19.0){
    b = 0.0;
  }else{
    b = clamp(0.543206789 * log(max(t - 10.0,1.0)) - 1.196254089,0.0,1.0);
  }

  return vec3(r,g,b);
}

void main(){

  vec2 uv = gl_PointCoord;

  vec4 tex = texture2D(map,uv);

  float dist = distance(uv,vec2(0.5));
  if(dist > 0.5) discard;

  float halo = smoothstep(0.55,0.0,dist);
  float core = smoothstep(0.28,0.0,dist);

  float spike =
    pow(abs(uv.x - 0.5),6.0) +
    pow(abs(uv.y - 0.5),6.0);

  float diffraction =
    1.0 - clamp(spike * 22.0,0.0,1.0);

  vec3 tempColor = kelvinToRGB(vTemp);

  vec3 baseColor = max(vColor, vec3(0.2)); 

  vec3 color = baseColor * tempColor;

  float glow =
    core +
    halo * uHalo +
    diffraction * 0.75;

  glow *= clamp(30.0 / vDist,0.25,1.0);

  vec3 finalColor =
    color * glow * uIntensity;

  gl_FragColor =
    vec4(finalColor, tex.a * glow);

}
`