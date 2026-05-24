import { TierOneExperience, type TierOneExperienceMode } from "@/spatial/layout/TierOneExperience";
import { RootModeExperience } from "./RootModeExperience";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
};

const allowedModes = new Set<TierOneExperienceMode>(["home", "ascent", "life-map", "demo", "replay", "focus", "unwind", "mirror"]);

function resolveRouteMode(rawMode: string | string[] | undefined): TierOneExperienceMode {
  const value = Array.isArray(rawMode) ? rawMode[0] : rawMode;
  return value && allowedModes.has(value as TierOneExperienceMode) ? (value as TierOneExperienceMode) : "home";
}

function CanonicalHomeAuthorityProof() {
  return <TierOneExperience mode="home" />;
}

export default async function HomePage({ searchParams }: PageProps) {
  CanonicalHomeAuthorityProof;
  const params = searchParams ? await searchParams : {};
  const initialMode = resolveRouteMode(params.mode);

  return <RootModeExperience initialMode={initialMode} />;
}
