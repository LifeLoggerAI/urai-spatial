export const CHANNELS:ReadonlyArray<string>
export function calibrationPose(t:number,playing?:boolean,reducedMotion?:boolean,muted?:boolean,profile?:'short'|'capture'):Record<string,number>
export function makeToneWav(profile?:'short'|'capture'):Uint8Array
export function writeMorphs(scene:{traverse(callback:(object:any)=>void):void},weights:Record<string,number>):{written:number;max:number;classification:string}
export function clearMorphs(scene:{traverse(callback:(object:any)=>void):void}):{written:number;max:number;classification:string}
