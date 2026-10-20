export interface FounderPlaybackAuthority {
 accountId:string;subjectId:'adam';identityKind:'founder';actorEpoch:string;
 aiConsent:boolean;voiceConsent:boolean;likenessApproved:boolean;modelAdmitted:boolean;
 modelSha256:string;voiceAdmitted:boolean;approvedVoiceId:string;voiceApprovalSha256:string;
 providerEnabled:boolean;revoked?:boolean
}
export interface FounderFaceFrame {
 accountId:string;subjectId:'adam';actorEpoch:string;turnId:number;modelSha256:string;
 voiceId:string;audioSha256:string;audioSeconds:number;playing:true
}
export function createFounderCharacterPlaybackGate(options:{
 ownerAccountId:string;getAuthority:()=>FounderPlaybackAuthority|null;
 verifyAuthorizedVoice:(input:{accountId:string;subjectId:'adam';actorEpoch:string;turnId:number;audioSha256:string;voiceId:string;voiceApprovalSha256:string;providerReceipt:unknown})=>Promise<boolean>;
 onFaceFrame:(frame:FounderFaceFrame)=>void;onNeutral:(reason:string)=>void;abortConversation:(reason:string)=>void
}):{
 snapshot():Readonly<{generation:number;hasTurn:boolean;speaking:boolean;disposed:boolean}>;
 beginTurn():number|null;
 startAuthorizedAudio(input:{id:number;media:HTMLAudioElement;audioSha256:string;voiceId:string;voiceApprovalSha256:string;providerReceipt:unknown}):Promise<boolean>;
 frame(id:number):boolean;finish(id:number):boolean;interrupt():unknown;dispose():unknown
}