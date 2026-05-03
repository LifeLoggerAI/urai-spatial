export type XRBridgeState = {
label: string;
connected: boolean;
};

export function resolveXRBridgeState(connected: boolean): XRBridgeState {
return {
label: "XR Bridge",
connected,
};
}
