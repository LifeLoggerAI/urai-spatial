export type AdamLocalEmulatorRewrite = { source: string; destination: string }
export declare function adamLocalEmulatorRewrites(
  env?: NodeJS.ProcessEnv,
): AdamLocalEmulatorRewrite[]
