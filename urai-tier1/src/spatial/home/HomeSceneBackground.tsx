"use client";

import { useMemo } from "react";

type Star = {
  id: string;
  left: string;
  top: string;
  size: number;
  opacity: number;
  blur: number;
};

function buildStars(count: number): Star[] {
  return Array.from({ length: count }, (_, index) => {
    const left = (index * 37 + 11) % 100;
    const top = 4 + ((index * 53 + 17) % 82);
    const size = 1 + (index % 4);
    const opacity = 0.22 + (index % 7) * 0.07;
    const blur = index % 5 === 0 ? 10 : 0;

    return {
      id: "home-star-" + index,
      left: left + "%",
      top: top + "%",
      size,
      opacity,
      blur,
    };
  });
}

export function HomeSceneBackground() {
  const stars = useMemo(() => buildStars(92), []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 18%, rgba(156, 104, 255, 0.34), rgba(70, 22, 130, 0.16) 24%, rgba(9, 2, 24, 0.96) 62%, #03010a 100%)",
        }}
      />

      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(80, 24, 150, 0.18) 0%, rgba(9, 5, 23, 0.10) 42%, rgba(3, 1, 10, 0.0) 62%, rgba(4, 3, 10, 0.86) 100%)",
        }}
      />

      <div
        className="absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(circle at 50% 30%, transparent 0%, transparent 42%, rgba(0,0,0,0.36) 100%)",
        }}
      />

      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute rounded-full bg-white"
          style={{
            left: star.left,
            top: star.top,
            width: star.size,
            height: star.size,
            opacity: star.opacity,
            filter: star.blur ? "blur(" + star.blur + "px)" : undefined,
            boxShadow: "0 0 18px rgba(216,180,254,0.9)",
          }}
        />
      ))}

      <div
        className="absolute bottom-[-15vh] left-1/2 h-[38vh] w-[138vw] -translate-x-1/2 rounded-[50%] blur-2xl"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(105, 64, 230, 0.34) 0%, rgba(42, 24, 86, 0.20) 36%, rgba(4, 2, 10, 0.02) 74%, transparent 100%)",
        }}
      />

      <div
        className="absolute bottom-[12vh] left-1/2 h-[12rem] w-[48rem] -translate-x-1/2 rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(188, 164, 255, 0.18) 0%, rgba(122, 82, 255, 0.10) 38%, rgba(10, 4, 23, 0.0) 76%)",
        }}
      />

      <div
        className="absolute bottom-0 left-0 right-0 h-[28vh]"
        style={{
          background:
            "linear-gradient(to top, rgba(2,1,8,0.96), rgba(5,2,15,0.72) 36%, transparent)",
        }}
      />
    </div>
  );
}

export default HomeSceneBackground;
