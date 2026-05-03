export type SceneExportManifest = {
name: string;
version: string;
generatedAt: string;
};

export function resolveSceneExportManifest(version = "1.0.0"): SceneExportManifest {
return {
name: "Scene Export Manifest",
version,
generatedAt: new Date().toISOString(),
};
}
