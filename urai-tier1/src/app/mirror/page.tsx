import { TierOneExperience } from "@/spatial/layout/TierOneExperience";
import { MirrorReturnControls } from "./MirrorReturnControls";

export default function MirrorRoute() {
  return <TierOneExperience mode="mirror" cta={<MirrorReturnControls />} />;
}
