const ALLOWED_OBSERVATIONS = new Set([
  "route_health",
  "asset_health",
  "performance",
  "accessibility_evidence",
  "provider_health",
]);

export function observeProduct(snapshot) {
  if (!ALLOWED_OBSERVATIONS.has(snapshot?.type)) throw new Error("unsupported observation type");
  return {
    version:"1.0.0",
    observationId:snapshot.observationId,
    type:snapshot.type,
    target:snapshot.target,
    status:snapshot.status,
    evidenceRefs:[...new Set(snapshot.evidenceRefs ?? [])].sort(),
    observedAt:snapshot.observedAt,
    readOnly:true,
    canWriteProduction:false,
    canMerge:false,
    canDeploy:false,
  };
}

export function proposeImprovement(observation,{summary,rationale}) {
  if (!observation?.readOnly) throw new Error("read-only observation required");
  if (!summary || !rationale) throw new Error("proposal content required");
  return {
    version:"1.0.0",
    proposalId:"proposal:"+observation.observationId,
    observationId:observation.observationId,
    summary,
    rationale,
    evidenceRefs:observation.evidenceRefs,
    action:"human_review_required",
    writeAuthority:false,
    mergeAuthority:false,
    deployAuthority:false,
  };
}
