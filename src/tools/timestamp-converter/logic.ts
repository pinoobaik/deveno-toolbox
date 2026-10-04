import {
  MAX_TIMESTAMP_MS,
  MIN_TIMESTAMP_MS,
  type TimestampResult,
  type TimestampResultSuccess,
} from './types'

/**
 * Any absolute value below this threshold is treated as seconds, above it as
 * milliseconds. 1e11 ms is 1973-03-03, while 1e11 s is far beyond year 5138,
 * so the boundary is unambiguous for realistic input.
 */
const SECONDS_UPPER_BOUND = 1e11

/** Longest fragment of the user's own input echoed back inside an error. */
const MAX_ECHO_LENGTH = 40

const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/
const DATE_TIME_PREFIX = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/
const ZONE_DESIGNATOR = /(?:Z\b|[+-]\d{2}:?\d{2}$|\b(?:GMT|UTC|[ECMP][DS]T)\b)/i

export interface DateInputInterpretation {
  /** Text actually handed to `Date.parse`. */
  readonly normalized: string
  /** True when the input carried no zone and was therefore read as local time. */
  readonly assumesLocalTime: boolean
}

/**
 * Decides how a date string should be read, and reports whether that reading
 * depends on the browser timezone.
 *
 * ECMA-262 defines a date-only ISO form (`2024-01-15`) as UTC midnight, so it
 * is pinned explicitly instead of being left to the local-time fallback that
 * `Date.parse` applies to date-and-time forms without a zone.
 */
export function interpretDateInput(raw: string): DateInputInterpretation {
  const text = raw.trim()

  if (ISO_DATE_ONLY.test(text)) {
    return { normalized: `${text}T00:00:00Z`, assumesLocalTime: false }
  }

  const normalized = DATE_TIME_PREFIX.test(text) ? text.replace(' ', 'T') : text

  return { normalized, assumesLocalTime: !ZONE_DESIGNATOR.test(normalized) }
}

/**
 * Converts a Unix timestamp to a structured result. Accepts seconds or
 * milliseconds, integers or decimals, and never throws.
 */
export function timestampToDate(input: string): TimestampResult {
  const text = input.trim()

  if (text.length === 0) {
    return { ok: false, kind: 'empty', message: 'Enter a timestamp to convert.' }
  }

  if (!/^[-+]?\d+(\.\d+)?$/.test(text)) {
    return {
      ok: false,
      kind: 'invalid-number',
      message: `${echo(text)} is not a Unix timestamp. Use digits only, for example 1705314600.`,
    }
  }

  const numeric = Number(text)

  if (!Number.isFinite(numeric)) {
    return { ok: false, kind: 'invalid-number', message: 'Timestamp is out of numeric range.' }
  }

  const milliseconds = normalizeToMilliseconds(numeric)

  if (milliseconds < MIN_TIMESTAMP_MS || milliseconds > MAX_TIMESTAMP_MS) {
    return {
      ok: false,
      kind: 'out-of-range',
      message: 'Timestamp falls outside the supported date range (year 0000 to 275760).',
    }
  }

  return buildResult(milliseconds)
}

/**
 * Converts a human readable date string to a Unix timestamp. Returns `ok: false`
 * for unparseable input so callers never have to guard against `NaN`.
 */
export function dateToTimestamp(input: string): TimestampResult {
  const text = input.trim()

  if (text.length === 0) {
    return { ok: false, kind: 'empty', message: 'Enter a date to convert.' }
  }

  const { normalized } = interpretDateInput(text)
  const parsed = Date.parse(normalized)

  if (Number.isNaN(parsed)) {
    return {
      ok: false,
      kind: 'invalid-date',
      message: `${echo(text)} could not be read as a date. Try 2024-01-15 14:30:00, 2024-01-15T14:30:00Z, or Mon, 15 Jan 2024 14:30:00 GMT.`,
    }
  }

  return buildResult(parsed)
}

/** Normalizes a raw numeric value to milliseconds, assuming seconds when small. */
export function normalizeToMilliseconds(value: number): number {
  return Math.abs(value) < SECONDS_UPPER_BOUND ? Math.round(value * 1000) : Math.round(value)
}

/** Formats a millisecond value into both local and UTC representations. */
export function buildResult(milliseconds: number): TimestampResultSuccess {
  const date = new Date(milliseconds)

  return {
    ok: true,
    seconds: Math.floor(milliseconds / 1000),
    milliseconds,
    localIso: toLocalIso(date),
    localDisplay: date.toLocaleString(undefined, LOCAL_DATE_OPTIONS),
    utcDisplay: `${date.toUTCString()}`,
  }
}

const LOCAL_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
  timeZoneName: 'short',
}

function toLocalIso(date: Date): string {
  const offsetMinutes = -date.getTimezoneOffset()
  const sign = offsetMinutes >= 0 ? '+' : '-'
  const absolute = Math.abs(offsetMinutes)
  const offset = `${sign}${pad(Math.floor(absolute / 60))}:${pad(absolute % 60)}`

  return `${formatLocalPart(date)}${offset}`
}

function formatLocalPart(date: Date): string {
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  )
}

/** Quotes a short fragment of the input so the message stays readable. */
function echo(text: string): string {
  const collapsed = text.replace(/\s+/g, ' ')

  return collapsed.length <= MAX_ECHO_LENGTH
    ? `"${collapsed}"`
    : `"${collapsed.slice(0, MAX_ECHO_LENGTH)}…"`
}

function pad(value: number): string {
  return value.toString().padStart(2, '0')
}