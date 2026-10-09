import {
  MAX_COLOR_CHARS,
  type ColorErrorKind,
  type ColorFailure,
  type ColorResult,
  type ColorSourceFormat,
  type ParsedColor,
} from './types'

const EMPTY_MESSAGE = 'Nothing to convert. Enter a color first.'
const TOO_LARGE_MESSAGE = `Input is larger than the ${MAX_COLOR_CHARS.toLocaleString('en-US')} character limit.`
const UNRECOGNIZED_MESSAGE = 'Start with #hex, rgb(…), rgba(…), hsl(…), or hsla(…).'
const MALFORMED_MESSAGE = 'The color value is not well-formed.'
const CHANNEL_COUNT_MESSAGE = 'Expected exactly 3 color channels and an optional alpha.'
const ALPHA_MESSAGE = 'Alpha must be between 0 and 1, or 0% and 100%.'
const RGB_RANGE_MESSAGE = 'RGB channels must be integers 0–255 or percentages 0–100%.'
const SL_RANGE_MESSAGE = 'Saturation and lightness must be percentages 0–100%.'
const HEX_LENGTH_MESSAGE = 'Hex colors expect exactly 3, 4, 6, or 8 digits.'
const HEX_DIGIT_MESSAGE = 'Hex colors allow only 0-9 and a-f.'

const FUNCTION_PATTERN = /^(rgb|rgba|hsl|hsla)\(([\s\S]*)\)$/i
const PERCENT = /^(\d+(?:\.\d+)?)%$/
const UNSIGNED_NUMBER = /^(\d+(?:\.\d+)?)$/
const SIGNED_NUMBER = /^([+-]?\d+(?:\.\d+)?)$/
const INTEGER = /^\d+$/

const MAX_CODE_HEX = 255

interface SpellFailure {
  readonly ok: false
  readonly kind: ColorErrorKind
  readonly message: string
}

function failure(kind: ColorErrorKind, message: string): ColorFailure {
  return { ok: false, kind, message }
}

function rgbFailure(from: SpellFailure): ColorFailure {
  return failure(from.kind, from.message)
}

function toHexByte(value: number): string {
  return value.toString(16).padStart(2, '0')
}

function roundAlpha(value: number): number {
  return Math.round(value * 10_000) / 10_000
}

function formatAlpha(value: number): string {
  return String(roundAlpha(value))
}

function normalizeHue(value: number): number {
  const wrapped = ((value % 360) + 360) % 360
  return Math.round(wrapped) % 360
}

/** Converts integer RGB to HSL. Hue wraps to 0-359; s and l are 0-100. */
function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rf = r / MAX_CODE_HEX
  const gf = g / MAX_CODE_HEX
  const bf = b / MAX_CODE_HEX
  const max = Math.max(rf, gf, bf)
  const min = Math.min(rf, gf, bf)
  const l = (max + min) / 2

  let h = 0
  let s = 0
  const delta = max - min

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1))
    let raw: number
    if (max === rf) raw = ((gf - bf) / delta) % 6
    else if (max === gf) raw = (bf - rf) / delta + 2
    else raw = (rf - gf) / delta + 4
    h = raw * 60
    if (h < 0) h += 360
  }

  return { h: normalizeHue(h), s: Math.round(s * 100), l: Math.round(l * 100) }
}

/** Converts HSL (hue degrees, s/l 0-100) to integer RGB via the standard 6-section model. */
function hslToRgb(hue: number, s: number, l: number): { r: number; g: number; b: number } {
  const sF = s / 100
  const lF = l / 100
  const c = (1 - Math.abs(2 * lF - 1)) * sF
  const hPrime = normalizeHue(hue) / 60
  const x = c * (1 - Math.abs((hPrime % 2) - 1))

  let rf = 0
  let gf = 0
  let bf = 0

  if (hPrime < 1) {
    rf = c
    gf = x
  } else if (hPrime < 2) {
    rf = x
    gf = c
  } else if (hPrime < 3) {
    gf = c
    bf = x
  } else if (hPrime < 4) {
    gf = x
    bf = c
  } else if (hPrime < 5) {
    rf = x
    bf = c
  } else {
    rf = c
    bf = x
  }

  const m = lF - c / 2
  return {
    r: Math.round((rf + m) * MAX_CODE_HEX),
    g: Math.round((gf + m) * MAX_CODE_HEX),
    b: Math.round((bf + m) * MAX_CODE_HEX),
  }
}

function checkRange(token: string, kind: ColorErrorKind, message: string): SpellFailure | null {
  if (PERCENT.test(token)) {
    const value = Number(PERCENT.exec(token)?.[1])
    return value > 100 ? failure(kind, message) : null
  }
  if (INTEGER.test(token)) {
    const value = Number(token)
    return value > MAX_CODE_HEX ? failure(kind, message) : null
  }
  return failure('malformed', MALFORMED_MESSAGE)
}

/** RGB channel: integer 0-255 or percentage 0-100%. */
function parseRgbChannel(token: string): { ok: true; value: number } | SpellFailure {
  const check = checkRange(token, 'out-of-range', RGB_RANGE_MESSAGE)
  if (check !== null) return check

  const percent = PERCENT.exec(token)
  if (percent !== null) {
    const value = Number(percent[1])
    return { ok: true, value: (value / 100) * MAX_CODE_HEX }
  }
  return { ok: true, value: Number(token) }
}

/** HSL saturation/lightness: percentage 0-100% only. */
function parseHslPercent(token: string): { ok: true; value: number } | SpellFailure {
  const percent = PERCENT.exec(token)
  if (percent === null) return { ok: false, kind: 'malformed', message: MALFORMED_MESSAGE }
  const value = Number(percent[1])
  if (value > 100) return { ok: false, kind: 'out-of-range', message: SL_RANGE_MESSAGE }
  return { ok: true, value }
}

/** Production: hue is any finite number and wraps; 0-1 unitless or 0-100% alpha. */
function parseHue(token: string): { ok: true; value: number } | SpellFailure {
  const match = SIGNED_NUMBER.exec(token)
  if (match === null) return { ok: false, kind: 'malformed', message: MALFORMED_MESSAGE }
  return { ok: true, value: Number(match[1]) }
}

function parseAlpha(token: string): { ok: true; value: number } | SpellFailure {
  const percent = PERCENT.exec(token)
  if (percent !== null) {
    const value = Number(percent[1])
    if (value > 100) return { ok: false, kind: 'out-of-range', message: ALPHA_MESSAGE }
    return { ok: true, value: value / 100 }
  }

  const match = UNSIGNED_NUMBER.exec(token)
  if (match === null) return { ok: false, kind: 'malformed', message: MALFORMED_MESSAGE }
  const value = Number(match[1])
  if (value > 1) return { ok: false, kind: 'out-of-range', message: ALPHA_MESSAGE }
  return { ok: true, value }
}

interface SplitBody {
  readonly ok: true
  readonly channels: readonly string[]
  readonly alpha: string | null
}

/** Splits `rgb(...)` / `hsl(...)` inner text into 3 channels and optional alpha. */
function splitBody(inner: string): SplitBody | SpellFailure {
  const trimmed = inner.trim()
  if (trimmed.length === 0) return { ok: false, kind: 'malformed', message: CHANNEL_COUNT_MESSAGE }

  const hasComma = trimmed.includes(',')
  const hasSlash = trimmed.includes('/')
  if (hasComma && hasSlash) return { ok: false, kind: 'malformed', message: MALFORMED_MESSAGE }

  if (hasComma) {
    const parts = trimmed.split(',')
    if (parts.length !== 3 && parts.length !== 4) {
      return { ok: false, kind: 'malformed', message: CHANNEL_COUNT_MESSAGE }
    }
    const channels = parts.slice(0, 3).map((part) => part.trim())
    if (channels.some((channel) => channel.length === 0)) {
      return { ok: false, kind: 'malformed', message: CHANNEL_COUNT_MESSAGE }
    }
    const alpha = parts.length === 4 ? parts[3]?.trim() : null
    if (alpha === '') return { ok: false, kind: 'malformed', message: MALFORMED_MESSAGE }
    return alpha === null || alpha === undefined ? { ok: true, channels, alpha: null } : { ok: true, channels, alpha }
  }

  const slashIndex = trimmed.indexOf('/')
  const left = slashIndex >= 0 ? trimmed.slice(0, slashIndex) : trimmed
  const right = slashIndex >= 0 ? trimmed.slice(slashIndex + 1).trim() : ''
  if (slashIndex >= 0 && right.length === 0) {
    return { ok: false, kind: 'malformed', message: MALFORMED_MESSAGE }
  }

  const tokens = left.trim().split(/\s+/)
  if (tokens.length < 3 || tokens.length > 4) {
    return { ok: false, kind: 'malformed', message: CHANNEL_COUNT_MESSAGE }
  }
  const channels = tokens.slice(0, 3)
  let alpha: string | null = slashIndex >= 0 ? right : null
  if (tokens.length === 4) {
    if (alpha !== null) return { ok: false, kind: 'malformed', message: MALFORMED_MESSAGE }
    alpha = tokens[3] as string
  }

  return { ok: true, channels, alpha }
}

function buildColor(
  r: number,
  g: number,
  b: number,
  alpha: number,
  source: ColorSourceFormat,
): ParsedColor {
  const hsl = rgbToHsl(r, g, b)
  const hex = `#${toHexByte(r)}${toHexByte(g)}${toHexByte(b)}${
    alpha < 1 ? toHexByte(Math.round(alpha * MAX_CODE_HEX)) : ''
  }`
  const rgbText =
    alpha === 1
      ? `rgb(${r}, ${g}, ${b})`
      : `rgba(${r}, ${g}, ${b}, ${formatAlpha(alpha)})`
  const hslText =
    alpha === 1
      ? `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`
      : `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, ${formatAlpha(alpha)})`

  return { r, g, b, h: hsl.h, s: hsl.s, l: hsl.l, alpha: roundAlpha(alpha), hex, rgb: rgbText, hsl: hslText, source }
}

function parseHex(trimmed: string): ColorResult {
  if (!trimmed.startsWith('#')) return failure('unrecognized', UNRECOGNIZED_MESSAGE)

  const digits = trimmed.slice(1)
  if (!/^[0-9A-Fa-f]+$/.test(digits)) return failure('malformed', HEX_DIGIT_MESSAGE)
  if (digits.length !== 3 && digits.length !== 4 && digits.length !== 6 && digits.length !== 8) {
    return failure('malformed', HEX_LENGTH_MESSAGE)
  }

  const expanded = digits.length <= 4
    ? digits.split('').map((digit) => digit + digit).join('')
    : digits
  if (expanded.length % 2 === 1) return failure('malformed', HEX_LENGTH_MESSAGE)

  const r = Number.parseInt(expanded.slice(0, 2), 16)
  const g = Number.parseInt(expanded.slice(2, 4), 16)
  const b = Number.parseInt(expanded.slice(4, 6), 16)
  const alpha = expanded.length === 8 ? roundAlpha(Number.parseInt(expanded.slice(6, 8), 16) / MAX_CODE_HEX) : 1

  return { ok: true, color: buildColor(r, g, b, alpha, 'hex') }
}

function parseFunction(trimmed: string): ColorResult {
  const match = FUNCTION_PATTERN.exec(trimmed)
  if (match === null) return failure('unrecognized', UNRECOGNIZED_MESSAGE)

  const name = (match[1] as string).toLowerCase()
  const inner = match[2] as string
  const split = splitBody(inner)
  if (!split.ok) return rgbFailure(split)
  if (split.channels.length !== 3) return failure('malformed', CHANNEL_COUNT_MESSAGE)

  let alpha = 1
  if (split.alpha !== null) {
    const parsedAlpha = parseAlpha(split.alpha)
    if (!parsedAlpha.ok) return rgbFailure(parsedAlpha)
    alpha = parsedAlpha.value
  }

  if (!name.startsWith('rgb')) {
    const hueResult = parseHue(split.channels[0] as string)
    if (!hueResult.ok) return rgbFailure(hueResult)
    const sResult = parseHslPercent(split.channels[1] as string)
    if (!sResult.ok) return rgbFailure(sResult)
    const lResult = parseHslPercent(split.channels[2] as string)
    if (!lResult.ok) return rgbFailure(lResult)

    const { r, g, b } = hslToRgb(hueResult.value, sResult.value, lResult.value)
    return { ok: true, color: buildColor(r, g, b, alpha, 'hsl') }
  }

  const red = parseRgbChannel(split.channels[0] as string)
  if (!red.ok) return rgbFailure(red)
  const green = parseRgbChannel(split.channels[1] as string)
  if (!green.ok) return rgbFailure(green)
  const blue = parseRgbChannel(split.channels[2] as string)
  if (!blue.ok) return rgbFailure(blue)

  const r = Math.round(red.value)
  const g = Math.round(green.value)
  const b = Math.round(blue.value)
  return { ok: true, color: buildColor(r, g, b, alpha, 'rgb') }
}

/**
 * Parses a color in hex, rgb(), or hsl() form and exposes every canonical
 * representation. Parsing is pure and bounded: no DOM, no stylesheet, no
 * rendering. Out-of-range channels are rejected rather than clamped, hue is the
 * one value that wraps by design, and alpha is rounded for display so repeated
 * round-trips stay stable. Errors are fixed messages and never echo the input.
 */
export function parseColor(input: string): ColorResult {
  if (input.length === 0) return failure('empty', EMPTY_MESSAGE)
  if (input.length > MAX_COLOR_CHARS) return failure('too-large', TOO_LARGE_MESSAGE)

  const trimmed = input.trim()
  if (trimmed.length === 0) return failure('empty', EMPTY_MESSAGE)

  if (trimmed.startsWith('#')) return parseHex(trimmed)
  return parseFunction(trimmed)
}