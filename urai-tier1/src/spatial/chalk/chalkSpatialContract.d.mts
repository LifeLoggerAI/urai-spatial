export type ChalkDiagnostic = {kind:string;repository:string;sourceSha:string;component:string;route:string;selectedStar:null|{id:string;classification:string};frameSamples:number;p95Ms:number|null;status:'LOCAL_UNSUBMITTED';authority:string};
export function chalkIntent(value: unknown):'NOT_CONNECTED'|'DIAGNOSTIC'|'READ_JOBS';
export function chalkDiagnostic(input:{route:string;component:string;sourceSha:string;actorUid:string;frames?:number[];star?:{authorized:boolean;ownerUid:string;id:string}|null;allowStar?:boolean}):ChalkDiagnostic;
