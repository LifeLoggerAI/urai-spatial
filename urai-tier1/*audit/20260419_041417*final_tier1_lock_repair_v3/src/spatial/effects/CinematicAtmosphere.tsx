"use client";

export default function CinematicAtmosphere() {
  return (
    <>
      <color attach="background" args={["#020617"]} />
      <fog attach="fog" args={["#020817", 2.5, 12]} />
    </>
  );
}
