export type ChalkReviewDiagnostic = {kind:string;repository:string;sourceSha:string;component:string;route:string;selectedStar:null;frameSamples:number;p95Ms:number|null;status:string;authority:string};
export type ChalkReviewRequest = Readonly<{requestId:string;diagnostic:ChalkReviewDiagnostic}>;
export function chalkReviewRequest(diagnostic:ChalkReviewDiagnostic,requestId:string):ChalkReviewRequest;
export function chalkReviewReceipt(request:ChalkReviewRequest,response:unknown,readback:unknown):Promise<Readonly<{reviewId:string;state:'REVIEW_ONLY_NOT_QUEUED';sourceSha:string}>>;
