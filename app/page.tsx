"use client"
import EngineRoot from "@/engine/core/EngineRoot";
import { Suspense } from "react";
export default () => <Suspense fallback={null}><EngineRoot /></Suspense>;
