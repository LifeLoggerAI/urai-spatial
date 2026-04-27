"use client";

type Tier1ShellNodeFieldProps = {
label: string;
value: unknown;
};

function stringifyValue(val: unknown): string {
if (typeof val === "string") return val;
if (typeof val === "number" || typeof val === "boolean") return String(val);
if (val == null) return "";
try {
return JSON.stringify(val);
} catch {
return String(val);
}
}

export function Tier1ShellNodeField({ label, value }: Tier1ShellNodeFieldProps) {
return ( <div> <strong>{label}</strong> <span>{stringifyValue(value)}</span> </div>
);
}

export default Tier1ShellNodeField;
