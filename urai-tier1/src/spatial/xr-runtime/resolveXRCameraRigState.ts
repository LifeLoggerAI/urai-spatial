export type XRCameraRigState = {
label: string;
active: boolean;
};

export function resolveXRCameraRigState(active: boolean): XRCameraRigState {
return {
label: "XR Camera Rig",
active,
};
}
