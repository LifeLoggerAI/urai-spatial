import { TierOneExperience } from "@/spatial/layout/TierOneExperience";

export const metadata = {
  title: "URAI Home — data-urai-home-spatial-shell",
  description: "data-urai-home-spatial-shell",
  other: {
    "data-urai-home-spatial-shell": "true",
  },
};

export default function HomeRoutePage() {
  return (
    <div className="urai-home-shell" data-urai-home-spatial-shell>
      <TierOneExperience mode="home" />
    </div>
  );
}
