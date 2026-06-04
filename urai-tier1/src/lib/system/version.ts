export const URAI_APP_VERSION = "0.1.0-genesis";
export const URAI_RELEASE_CHANNEL = "public_demo";
export const URAI_BUILD_LABEL = "Genesis V1";

export const URAI_VERSION_RULES = [
  "0.1.x = V1 public demo patches",
  "0.2.x = first private alpha expansion",
  "0.3.x = broader beta",
  "1.0.0 = full public V1 launch",
] as const;

export const URAI_PATCH_VERSION_EXAMPLES = [
  "0.1.1 privacy/copy hotfix",
  "0.1.2 mobile layout patch",
  "0.1.3 demo/waitlist patch",
] as const;
