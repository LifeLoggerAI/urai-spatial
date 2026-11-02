export declare const HOME_CC0_SCENE_AUDIT_VERSION: string
export interface HomeCC0SceneAuditResult {
  groundMeshes: number
  pathMeshes: number
  shrubMeshes: number
  photoTexturesComplete: boolean
  sceneBound: boolean
  reasons: string[]
}
export declare function auditHomeCC0Scene(scene: unknown): HomeCC0SceneAuditResult
