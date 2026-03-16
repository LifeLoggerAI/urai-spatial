export const STAR_COLS = 5
export const STAR_ROWS = 4

export const STAR_SPACING_X = 3
export const STAR_SPACING_Y = 2.5

export const STAR_TOTAL = STAR_COLS * STAR_ROWS

export const STAR_LAYOUT = Object.freeze({
  cols: STAR_COLS,
  rows: STAR_ROWS,
  spacingX: STAR_SPACING_X,
  spacingY: STAR_SPACING_Y,
  total: STAR_TOTAL
})

export type StarLayout = typeof STAR_LAYOUT