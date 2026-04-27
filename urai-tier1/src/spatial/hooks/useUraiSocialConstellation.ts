import { useMemo } from "react";
import { resolveSocialConstellation } from "@/lib/uraiSocial/resolveSocialConstellation";

export function useUraiSocialConstellation(now: number) {
  return useMemo(() => resolveSocialConstellation(now), [Math.floor(now / 2500)]);
}
