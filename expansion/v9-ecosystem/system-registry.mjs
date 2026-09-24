export class EcosystemRegistry {
  #systems=new Map();

  register(snapshot) {
    if (!snapshot?.systemId || !snapshot?.repository) throw new Error("system identity required");
    if (snapshot.writeAuthority === true) throw new Error("ecosystem registry is read-only");
    this.#systems.set(snapshot.systemId,{
      systemId:snapshot.systemId,
      repository:snapshot.repository,
      version:snapshot.version ?? "unknown",
      status:snapshot.status ?? "unknown",
      dependencies:[...new Set(snapshot.dependencies ?? [])].sort(),
      evidenceRefs:[...new Set(snapshot.evidenceRefs ?? [])].sort(),
      capabilities:[...new Set(snapshot.capabilities ?? [])].sort(),
      observedAt:snapshot.observedAt,
      readOnly:true,
    });
  }

  snapshot() {
    return [...this.#systems.values()]
      .sort((a,b)=>a.systemId.localeCompare(b.systemId))
      .map((x)=>structuredClone(x));
  }

  dependencyHealth(systemId) {
    const system=this.#systems.get(systemId);
    if(!system) throw new Error("system not found");
    return system.dependencies.map((dep)=>{
      const target=this.#systems.get(dep);
      return {
        systemId:dep,
        known:Boolean(target),
        status:target?.status ?? "unknown",
      };
    });
  }
}
