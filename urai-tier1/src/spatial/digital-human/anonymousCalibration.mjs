// Anonymous technical calibration. Not speech synthesis, phoneme alignment, or a likeness.
export const CHANNELS = Object.freeze(['jawOpen','AA','EE','OO','PP','blinkLeft','blinkRight','browInnerUp','mouthSmileLeft','mouthSmileRight']);
export function calibrationPose(t, playing=false, reducedMotion=false, muted=false) {
 const values=Object.fromEntries(CHANNELS.map(k=>[k,0]));
 if(!playing || muted || !Number.isFinite(t) || t<0)return values;
 const pulse=(a,b)=>t>=a&&t<b?Math.min(1,(t-a)/.07,(b-t)/.07):0;
 const a=pulse(.18,.63),o=pulse(.73,1.1),e=pulse(1.2,1.62),s=pulse(1.73,2.08),f=reducedMotion?.55:1;
 values.jawOpen=f*(.66*a+.49*o+.26*e+.12*s);values.AA=.74*a*f;values.OO=.82*o*f;values.EE=.79*e*f;
 values.blinkLeft=.86*f*pulse(1.02,1.18);values.blinkRight=.86*f*pulse(1.04,1.2);
 values.mouthSmileLeft=.62*s*f;values.mouthSmileRight=.62*s*f;return values;
}
export function makeToneWav() {
 const rate=16000,samples=rate*2.3,output=new ArrayBuffer(44+samples*2),v=new DataView(output);
 const label=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i))};
 label(0,'RIFF');v.setUint32(4,36+samples*2,true);label(8,'WAVE');label(12,'fmt ');
 v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,rate,true);
 v.setUint32(28,rate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);label(36,'data');v.setUint32(40,samples*2,true);
 for(let i=0;i<samples;i++) {const t=i/rate,p=calibrationPose(t,true);const amp=Math.min(1,(p.jawOpen+p.AA+p.OO+p.EE+p.mouthSmileLeft)*.7);v.setInt16(44+2*i,Math.round(32767*.14*amp*Math.sin(2*Math.PI*220*t)),true)}
 return new Uint8Array(output);
}
export function writeMorphs(scene,weights) {
 let written=0,max=0;
 scene.traverse(mesh=>{if(!mesh?.morphTargetDictionary||!mesh?.morphTargetInfluences)return;
  for(const name of CHANNELS){const i=mesh.morphTargetDictionary[name];if(!Number.isInteger(i)||i<0||i>=mesh.morphTargetInfluences.length)continue;
   const w=Math.max(0,Math.min(1,Number(weights?.[name])||0));mesh.morphTargetInfluences[i]=w;max=Math.max(max,w);written++;}
 });
 return Object.freeze({written,max,classification:'anonymous-audio-clock-calibration-not-speech'});
}
export function clearMorphs(scene){return writeMorphs(scene,Object.fromEntries(CHANNELS.map(k=>[k,0])))}
