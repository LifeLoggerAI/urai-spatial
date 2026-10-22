import type { ChalkDiagnosticReference } from './chalkJobsTransportBoundary.mjs';
export type ChalkEngineeringIntakeProposal = Readonly<{operation:'submit';requestId:string;problem:string;diagnostic:ChalkDiagnosticReference;sourceSha:string;route:string;issue:'performance'|'interaction'}>;
export function makeChalkEngineeringIntakeProposal(input:{requestId:string;sourceSha:string;route:string;diagnostic:unknown;issue:'performance'|'interaction'}):ChalkEngineeringIntakeProposal;
