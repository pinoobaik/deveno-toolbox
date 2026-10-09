/**
 * Supported color syntax, documented exactly: `#RGB`, `#RGBA`, `#RRGGBB`,
 * `#RRGGBBAA`; `rgb(...)` / `rgba(...)` and `hsl(...)` / `hsla(...)` in classic
 * comma form and in `c1 c2 c3 / alpha` space-slash form. Channels are integers
 * (0-255) or percentages (0-100%) for RGB, percentages for HSL saturation and
 * lightness, and alpha is 0-1 or 0-100%. Hue wraps past 360 and below 0. No CSS
 * Color 4 `none` keywords, no `hwb()`, `lab()`, `oklab()`, or other spaces.
 */
export const MAX_COLOR_CHARS = 256

export type ColorErrorKind = 'empty' | 'too-large' | 'unrecognized' | 'malformed' | 'out-of-range'

export type ColorSourceFormat = 'hex' | 'rgb' | 'hsl'

/** Canonical color. Channels are whole numbers; alpha stays 0-1. */
export interface ParsedColor {
  readonly r: number
  readonly g: number
  readonly b: number
  readonly h: number
  readonly s: number
  readonly l: number
  /** Rounded to four decimals so repeated round-trips stay stable. */
  readonly alpha: number
  /** `#rgb` / `#rgba` form, with an alpha pair only when alpha < 1. */
  readonly hex: string
  /** `rgb(...)` or `rgba(...)`; alpha shown only when < 1. */
  readonly rgb: string
  /** `hsl(...)` or `hsla(...)`; alpha shown only when < 1. */
  readonly hsl: string
  readonly source: ColorSourceFormat
}

export interface ColorSuccess {
  readonly ok: true
  readonly color: ParsedColor
}

export interface ColorFailure {
  readonly ok: false
  readonly kind: ColorErrorKind
  /** Fixed wording; never echoes the input. */
  readonly message: string
}

export type ColorResult = ColorSuccess | ColorFailure