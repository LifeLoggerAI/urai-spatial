'use client';

import React from 'react';

const SpatialLighting = () => {
  return (
    <>
      {/* URAI Lighting Law: Controlled and deterministic. */}
      <ambientLight intensity={0.1} />
      <directionalLight
        position={[5, 10, 7]}
        intensity={0.8}
        color="#A7C7F7"
      />
    </>
  );
};

export default SpatialLighting;
