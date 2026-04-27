export type XRInputState = {
label: string;
connected: boolean;
};

export function resolveXRInputState(connected: boolean): XRInputState {
return {
label: connected ? "XR Input Connected" : "XR Input Mapping",
connected,
};
}
