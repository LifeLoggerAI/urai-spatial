export type ImmersiveReplayTraversal = {
label: string;
active: boolean;
};

export function resolveImmersiveReplayTraversal(active: boolean): ImmersiveReplayTraversal {
return {
label: "Immersive Replay Traversal",
active,
};
}
