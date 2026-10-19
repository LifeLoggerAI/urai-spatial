export interface CouncilAudioProof { readonly audioSha256: string; readonly byteLength: number }
export interface CouncilSpeakerAuthorization {
 accountId: string; actorGeneration: number; agentId: string; turnId: number;
 voiceId: string; voiceApprovalSha256: string; audioSha256: string
}
export interface CouncilPlaybackAuthority extends CouncilSpeakerAuthorization {
 aiConsent: boolean; voiceConsent: boolean; providerEnabled: boolean; revoked?: boolean
}
export interface CouncilClockFrame { actorGeneration:number; agentId:string; turnId:number; audioSha256:string; audioSeconds:number; playing:true; rms:number|null }
export function verifyCouncilAudioBytes(bytes: Uint8Array | ArrayBuffer | ArrayBufferView, expectedSha256:string): Promise<CouncilAudioProof|null>
export function createCouncilApprovedAudioClock(input: {
 media: HTMLAudioElement; proof:CouncilAudioProof; speaker:CouncilSpeakerAuthorization;
 getAuthority:()=>CouncilPlaybackAuthority|null; getRms?:()=>number|null;
 onFrame:(frame:CouncilClockFrame)=>void; onNeutral:(reason:string)=>void
}): {snapshot():unknown;start():Promise<boolean>;tick():unknown;interrupt():void;dispose():void}
export function bindCouncilAudioMorph(input: {
 clock:{tick():unknown;interrupt():void;dispose():void};
 morphDriver:{beginAudio(input:{turnId:number;audioSha256:string}):boolean;frame(input:unknown):unknown;interrupt():void};
 turnId:number;audioSha256:string;timeline?:unknown;reducedMotion?:boolean
}):{start():boolean;tick():unknown;onFrame(frame:CouncilClockFrame):unknown;stop():void;dispose():void}
