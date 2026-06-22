"use client";

import { usePathname } from "next/navigation";

const HOME_PATHS = new Set(["/", "/home", "/ascent"]);

const beacons = ["one", "two", "three", "four", "five", "six"];

export default function HomeSpatialWorldFinal() {
  const pathname = usePathname();
  if (!pathname || !HOME_PATHS.has(pathname)) return null;

  return (
    <section className="urai-home-spatial-world-final" data-home-world-owner="HomeSpatialWorldFinal" aria-label="URAI Spatial Genesis Home World">
      <div className="urai-home-spatial-world-final__sky" />
      <div className="urai-home-spatial-world-final__skyband urai-home-spatial-world-final__skyband--one" />
      <div className="urai-home-spatial-world-final__skyband urai-home-spatial-world-final__skyband--two" />
      <div className="urai-home-spatial-world-final__skyband urai-home-spatial-world-final__skyband--three" />
      <div className="urai-home-spatial-world-final__haze" />
      <div className="urai-home-spatial-world-final__horizon" />
      <div className="urai-home-spatial-world-final__terrain" />
      <div className="urai-home-spatial-world-final__shelf" />
      <div className="urai-home-spatial-world-final__pedestal" />
      <div className="urai-home-spatial-world-final__path" />
      <div className="urai-home-spatial-world-final__avatar">
        <span className="urai-home-spatial-world-final__avatar-core" />
        <span className="urai-home-spatial-world-final__avatar-body" />
        <span className="urai-home-spatial-world-final__avatar-glow" />
      </div>
      <div className="urai-home-spatial-world-final__beacons">
        {beacons.map((name) => (
          <span
            key={name}
            className={`urai-home-spatial-world-final__beacon urai-home-spatial-world-final__beacon--${name}`}
          />
        ))}
      </div>
      <div className="urai-home-spatial-world-final__foreground" />
    </section>
  );
}
