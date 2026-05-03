export type UnityAdapterState = {
label: string;
ready: boolean;
};

export function resolveUnityAdapterState(ready: boolean): UnityAdapterState {
return {
label: "Unity Adapter",
ready,
};
}
