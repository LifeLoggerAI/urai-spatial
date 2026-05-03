"use client";
import { useEffect } from "react";

export function useCanonEsc(handler) {
useEffect(() => {
const fn = (e) => {
if (e.key === "Escape") handler();
};
window.addEventListener("keydown", fn);
return () => window.removeEventListener("keydown", fn);
}, [handler]);
}
