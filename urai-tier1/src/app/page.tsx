import { TierOneExperience, type TierOneExperienceMode } from "@/spatial/layout/TierOneExperience";

const allowedModes = new Set<TierOneExperienceMode>(["home", "ascent", "life-map", "demo", "replay", "focus", "unwind", "mirror"]);

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function resolveRouteMode(rawMode: string | undefined): TierOneExperienceMode {
  return rawMode && allowedModes.has(rawMode as TierOneExperienceMode) ? (rawMode as TierOneExperienceMode) : "home";
}

function CanonicalHomeAuthorityProof() {
  return <TierOneExperience mode="home" />;
}

export default async function HomePage({ searchParams }: Props) {
  const params = (await searchParams) ?? {};
  const rawMode = Array.isArray(params.mode) ? params.mode[0] : params.mode;
  const mode = resolveRouteMode(rawMode);

  if (mode === "home") return <CanonicalHomeAuthorityProof />;

  return <TierOneExperience mode={mode} />;
}
