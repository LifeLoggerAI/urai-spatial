// Engineering-only projection of a local scene observation. Deliberately never
// forwards speech transcripts, private memory identifiers or model tool text.
import { chalkJobsDiagnosticRequest } from './chalkJobsTransportBoundary.mjs';

const ROUTE = new Set(['/', '/home', '/ascent', '/life-map', '/focus', '/replay']);
const SHA = /^[a-f0-9]{40}$/;
const DENY = code => { throw new Error('CHALK_INTAKE_PROPOSAL_' + code); };

export function makeChalkEngineeringIntakeProposal({ requestId, sourceSha, route, diagnostic, issue }) {
  if (!ROUTE.has(route) || !SHA.test(sourceSha) ||
      !['performance', 'interaction'].includes(issue)) DENY('CONTEXT');
  // No user-originated transcript, title, identity, media or raw URL goes into
  // the Jobs problem field, even if the caller passes such content elsewhere.
  const purpose = issue === 'performance' ? 'rendering and transition performance' : 'spatial interaction behavior';
  const component = route === '/' ? 'home' : route.slice(1);
  const problem = 'Investigate ' + purpose + ' in UrAi ' + component + ' at pinned spatial source ' + sourceSha.slice(0, 12) + '.';
  const request = chalkJobsDiagnosticRequest({ problem, requestId, diagnostic, sourceSha });
  if (request.diagnostic.route !== route) DENY('ROUTE_DRIFT');
  return Object.freeze({ ...request, sourceSha, route, issue });
}
