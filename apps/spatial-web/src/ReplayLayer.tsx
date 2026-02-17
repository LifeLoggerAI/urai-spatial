'use client';

import { useMemo, useState, useEffect } from "react";
import UraiSpatialScene from "./UraiSpatialScene";

export default function ReplayLayer({ replay, onStarClick, hoveredId, proximateId }) {

    if (!replay) {
        return null;
    }

    return <UraiSpatialScene onStarClick={onStarClick} hoveredId={hoveredId} proximateId={proximateId} />;
}
