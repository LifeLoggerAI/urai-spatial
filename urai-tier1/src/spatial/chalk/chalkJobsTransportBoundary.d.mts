export type ChalkDiagnosticReference = {kind:'chalk-spatial-diagnostic-v1';repository:'LifeLoggerAI/urai-spatial';sourceSha:string;component:string;route:string;selectedStar:null;frameSamples:number;p95Ms:number|null;status:'LOCAL_UNSUBMITTED';authority:'client-observation-not-server-verified'};
export type ChalkJobsSummary = {jobId:string;status:string;admission:'HELD_UNQUEUED'|'UNVERIFIED';queued:boolean|null;repository:string|null;sourceSha:string|null};
export function requireChalkJobsEmulator(input:{environment:string;journeyEmulatorEnabled:boolean;spatialProjectId:string;jobsProjectId:string}):true;
export function chalkJobsDiagnosticRequest(input:{problem:string;requestId:string;diagnostic:ChalkDiagnosticReference;sourceSha:string}):{operation:'submit';requestId:string;problem:string;diagnostic:ChalkDiagnosticReference};
export function chalkJobsStatusProjection(reply:unknown):ChalkJobsSummary[];
export function chalkJobsIntakeReceipt(reply:unknown):{jobId:string;status:'HELD_UNQUEUED';deduplicated:boolean};
