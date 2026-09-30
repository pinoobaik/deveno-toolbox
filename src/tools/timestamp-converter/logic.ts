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
      message: `"${text}" is not a Unix timestamp. Use digits only, for example 1705314600.`,
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

  const normalized = normalizeDateInput(text)
  const parsed = Date.parse(normalized)

  if (Number.isNaN(parsed)) {
    return {
      ok: false,
      kind: 'invalid-date',
      message: `"${text}" could not be read as a date. Try 2024-01-15 14:30:00, 2024-01-15T14:30:00Z, or Mon, 15 Jan 2024 14:30:00 GMT.`,
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
    utcIso: date.toISOString(),
    localDisplay: date.toLocaleString(undefined, LOCAL_DATE_OPTIONS),
    utcDisplay: `${date.toUTCString()}`,
    isValidDate: true,
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

/**
 * `Date.parse` on `YYYY-MM-DD HH:mm:ss` is treated inconsistently across
 * engines, so the space separator is normalised to `T`.
 */
function normalizeDateInput(text: string): string {
  if (/^\d{4}-\d{2}-\d{2}[ ]\d{2}:\d{2}/.test(text)) {
    return text.replace(' ', 'T')
  }

  return text
}

/** True when the string carries an explicit timezone designator. */
export function hasExplicitTimezone(text: string): boolean {
  return /(Z|[+-]\d{2}:?\d{2})$/i.test(text.trim())
}

function pad(value: number): string {
  return value.toString().padStart(2, '0')
}
