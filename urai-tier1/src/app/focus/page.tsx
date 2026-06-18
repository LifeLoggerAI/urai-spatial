import { TierOneExperience } from "@/spatial/layout/TierOneExperience";
import { FocusEscapeBridge } from "./FocusEscapeBridge";
import { FocusPlaceDoor } from "./FocusPlaceDoor";

type FocusRouteProps = {
  searchParams?: Promise<{
    manifestId?: string;
  }>;
};

export default async function FocusRoute({ searchParams }: FocusRouteProps) {
  const params = await searchParams;
  return (
    <main data-testid="urai-scene-stage" data-mode="focus" data-scene-mode="focus">
      <TierOneExperience mode="focus" />
      <FocusEscapeBridge />
      <FocusPlaceDoor manifestId={params?.manifestId} />
    </main>
  );
}
