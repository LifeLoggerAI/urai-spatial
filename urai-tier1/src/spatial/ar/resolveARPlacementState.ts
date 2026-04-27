export type ARPlacementState = {
id: string;
label: string;
active: boolean;
};

export function resolveARPlacementState(active: boolean): ARPlacementState {
return {
id: active ? "ar-placement-active" : "ar-placement-idle",
label: active ? "AR Placement Active" : "AR Placement",
active,
};
}
