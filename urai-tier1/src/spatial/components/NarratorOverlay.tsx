"use client";

type NarratorLine = {
text?: string;
tone?: string;
};

type Props = {
visible?: boolean;
line?: NarratorLine | string | null;
text?: string;
phase?: string;
};

export function NarratorOverlay({
visible = true,
line = null,
text = "",
}: Props) {
const resolvedText =
typeof line === "string"
? line
: line?.text || text || "URAI is listening for the next meaningful pattern.";

return (
<div
aria-live="polite"
className={[
"pointer-events-none absolute inset-x-0 bottom-8 z-40 flex justify-center px-4 transition-all duration-500",
visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3",
].join(" ")}
> <div className="max-w-xl rounded-2xl border border-white/15 bg-black/35 px-5 py-3 text-sm tracking-wide text-white/90 shadow-2xl backdrop-blur-md">
{resolvedText} </div> </div>
);
}

export default NarratorOverlay;
