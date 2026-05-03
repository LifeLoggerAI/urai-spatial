export type WebXREntryState = {
label: string;
enabled: boolean;
};

export function resolveWebXREntryState(enabled: boolean): WebXREntryState {
return {
label: "WebXR Scene Entry",
enabled,
};
}
