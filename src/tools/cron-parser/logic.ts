import {
  CRON_FIELD_BOUNDS,
  CRON_FIELD_LABELS,
  MAX_CRON_EXPRESSION_CHARS,
  type CronErrorKind,
  type CronFailure,
  type CronFieldBounds,
  type CronResult,
} from './types'

const EMPTY_MESSAGE = 'Nothing to parse. Enter a cron expression first.'

const TOO_LARGE_MESSAGE = `Expression is longer than the ${MAX_CRON_EXPRESSION_CHARS.toLocaleString('en-US')} character limit.`

const NAMES_MESSAGE = 'Month and weekday names are not supported; use numbers.'

const MALFORMED_MESSAGE = 'This looks like a malformed number, list, range, or step.'

const INVALID_STEP_MESSAGE = 'A step must be a positive whole number.'

const REVERSED_RANGE_MESSAGE = 'A range must start on a value no larger than where it ends.'

const SINGULAR = ['minute', 'hour', 'day of month', 'month', 'weekday'] as const
const PLURAL = ['minutes', 'hours', 'days of month', 'months', 'weekdays'] as const
const FULL = ['every minute', 'every hour', 'every day of month', 'every month', 'every day'] as const

const WHOLE_POSITIVE = /^[0-9]+$/

interface FieldFailure {
  readonly ok: false
  readonly kind: CronErrorKind
  readonly detail: string
}

function simple(kind: CronErrorKind, detail: string): FieldFailure {
  return { ok: false, kind, detail }
}

/** Parses one comma-list entry: `*`, `* / step`, `a`, `a-b`, `a-b / step`, `a / step`. */
function expandItem(
  item: string,
  bounds: CronFieldBounds,
): { readonly ok: true; readonly values: readonly number[] } | FieldFailure {
  if (item.length === 0) return simple('malformed', MALFORMED_MESSAGE)

  const slashParts = item.split('/')
  if (slashParts.length > 2) return simple('malformed', MALFORMED_MESSAGE)

  let step = 1
  if (slashParts.length === 2) {
    const stepText = slashParts[1] as string
    if (!WHOLE_POSITIVE.test(stepText)) return simple('invalid-step', INVALID_STEP_MESSAGE)
    step = Number(stepText)
    if (step < 1) return simple('invalid-step', INVALID_STEP_MESSAGE)
  }

  const base = slashParts[0] as string
  let start: number
  let end: number

  if (base === '*') {
    start = bounds.min
    end = bounds.max
  } else if (base.includes('-')) {
    const [startText, endText] = base.split('-', 2)
    if (startText === undefined || endText === undefined || !WHOLE_POSITIVE.test(startText) || !WHOLE_POSITIVE.test(endText)) {
      return simple('malformed', MALFORMED_MESSAGE)
    }
    start = Number(startText)
    end = Number(endText)
    if (start > end) return simple('reversed-range', REVERSED_RANGE_MESSAGE)
  } else {
    if (!WHOLE_POSITIVE.test(base)) return simple('malformed', MALFORMED_MESSAGE)
    start = Number(base)
    // A lone value with a step runs from the value to the field maximum.
    end = slashParts.length === 2 ? bounds.max : start
  }

  if (start < bounds.min || end > bounds.max) {
    const detail = `Values ${start}–${end} fall outside the allowed ${bounds.min}–${bounds.max}.`
    return simple('out-of-range', detail)
  }

  const values: number[] = []
  for (let value = start; value <= end; value += step) {
    values.push(value)
  }

  return { ok: true, values }
}

function fieldSummary(values: readonly number[], index: number): string {
  const bounds = CRON_FIELD_BOUNDS[index] as CronFieldBounds
  if (values.length === bounds.max - bounds.min + 1) return FULL[index] as string

  const singular = SINGULAR[index] as string
  const plural = PLURAL[index] as string

  if (values.length === 1) return `at ${singular} ${values[0] as number}`
  if (values.length <= 6) return `at ${plural} ${values.join(', ')}`

  const first = values[0] as number
  const last = values[values.length - 1] as number
  return `at ${values.length} values (${first}–${last})`
}

function parseField(raw: string, index: number): { readonly ok: true; values: readonly number[] } | FieldFailure {
  if (/[A-Za-z]/.test(raw)) return simple('names', NAMES_MESSAGE)

  const bounds = CRON_FIELD_BOUNDS[index] as CronFieldBounds
  const items = raw.split(',')
  const gathered: number[] = []
  const seen = new Set<number>()

  for (const item of items) {
    const result = expandItem(item, bounds)
    if (!result.ok) return result
    for (const value of result.values) {
      if (!seen.has(value)) {
        seen.add(value)
        gathered.push(value)
      }
    }
  }

  gathered.sort((a, b) => a - b)
  return { ok: true, values: gathered }
}

function failure(kind: CronErrorKind, message: string): CronFailure {
  return { ok: false, kind, message }
}

/**
 * Parses a five-field cron expression: minutes, hours, day-of-month, month,
 * day-of-week. Each field accepts `*`, `* / step`, a single value, a range
 * `a-b`, or any of those with a step, combined by commas. Values are validated
 * against Vixie bounds (weekday 0-7, where 0 and 7 are both Sunday) and
 * expanded fully for a readable breakdown.
 *
 * The day-of-month and day-of-week interaction is left for the caller to read
 * off the expanded fields: cron itself applies OR semantics when both fields
 * are restricted. This tool only expands and validates; it never computes
 * upcoming run times, because those depend on a timezone the browser cannot
 * truthfully claim. Errors are fixed messages: field labels are fixed, and only
 * numbers taken from the input appear, never the raw expression.
 */
export function parseCron(input: string): CronResult {
  if (input.length === 0) return failure('empty', EMPTY_MESSAGE)
  if (input.length > MAX_CRON_EXPRESSION_CHARS) return failure('too-large', TOO_LARGE_MESSAGE)

  const trimmed = input.trim()
  if (trimmed.length === 0) return failure('empty', EMPTY_MESSAGE)

  const fields = trimmed.split(/\s+/)
  if (fields.length !== 5) {
    const detail = `Expecting 5 fields (minutes, hours, day of month, month, day of week); got ${fields.length}.`
    return failure('field-count', detail)
  }

  const breakdowns: { label: string; raw: string; values: readonly number[]; summary: string }[] = []

  for (let index = 0; index < fields.length; index += 1) {
    const raw = fields[index] as string
    const label = CRON_FIELD_LABELS[index] as string
    const result = parseField(raw, index)
    if (!result.ok) {
      return failure(result.kind, `${label}: ${result.detail}`)
    }
    breakdowns.push({
      label,
      raw,
      values: result.values,
      summary: fieldSummary(result.values, index),
    })
  }

  return {
    ok: true,
    fields: breakdowns.map((field, index) =>
      index === 4 ? { ...field, note: 'In cron, 0 and 7 are both Sunday.' } : field,
    ),
  }
}