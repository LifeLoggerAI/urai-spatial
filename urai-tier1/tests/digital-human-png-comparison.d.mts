export interface ChromimumPngRegion { cx:number;cy:number;rx:number;ry:number }
export interface ChromimumPngPixelComparison {
 changed:number;checked:number;meanRgbDelta:number
 roi:{left:number;top:number;right:number;bottom:number}
}
export function decodeChromiumPng(bytes:Uint8Array):{width:number;height:number;bpp:number;pixels:Uint8Array}
export function compareChromiumPngRegion(beforePng:Uint8Array,afterPng:Uint8Array,region:ChromimumPngRegion):ChromimumPngPixelComparison
