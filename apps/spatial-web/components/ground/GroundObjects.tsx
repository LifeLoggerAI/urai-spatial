import { useGroundState } from "./ground-state";
import GroundObject from "./GroundObject";

export default function GroundObjects() {
  const objects = useGroundState((s) => s.objects);

  return (
    <>
      {objects.map((obj) => (
        <GroundObject key={obj.id} data={obj} />
      ))}
    </>
  );
}
