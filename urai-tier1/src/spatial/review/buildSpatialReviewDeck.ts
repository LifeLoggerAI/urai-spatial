export type SpatialReviewDeck = {
title: string;
slides: Array<{ id: string; title: string }>;
};

export function buildSpatialReviewDeck(items: string[]): SpatialReviewDeck {
return {
title: "Spatial Review Deck",
slides: items.map((item, index) => ({
id: `slide-${index + 1}`,
title: item,
})),
};
}
