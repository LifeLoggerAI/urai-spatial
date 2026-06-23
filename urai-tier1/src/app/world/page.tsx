import GroundWorldExperience from "@/spatial/ground/GroundWorldExperience";
import "@/spatial/ground/GroundWorldExperience.module.css";

export const metadata = {
  title: "Ground World · URAI Spatial",
  description: "The embodied URAI layer where council avatars and real-life objects live.",
};

export default function GroundWorldPage() {
  return <GroundWorldExperience />;
}
