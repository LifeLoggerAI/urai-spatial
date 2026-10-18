export const DEFAULT_PROXIMITY: Readonly<{enterMeters:number;leaveMeters:number}>
export function proximityState(near:boolean,distanceMeters:number,config?:Readonly<{enterMeters:number;leaveMeters:number}>):boolean
export function clamp01(value:number):number
export function createHumanEncounter(config?:Readonly<{enterMeters:number;leaveMeters:number}>):{
 snapshot():Readonly<{near:boolean;phase:string;generation:number;audioPlaying:boolean;disposed:boolean}>
 track(distanceMeters:number):unknown
 beginTurn(input:{consentActive?:boolean;permitted?:boolean}):number|null
 markSpeaking(turn:number):boolean
 finish(turn:number):boolean
 interrupt():unknown
 dispose():unknown
}
export function validateHumanAdmission(manifest:unknown,ctx:unknown):{ok:boolean;problems:string[]}
export function classifyGltf(glTF:unknown):unknown
export function speechPose(input:unknown):unknown
