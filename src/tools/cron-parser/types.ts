/**
 * Scope is deliberately narrow: the five standard cron fields only. There are
 * no seconds, no years, no month or weekday names, no `@reboot`-style
 * shortcuts, and no Quartz/Spring extensions. Bounds follow Vixie cron with one
 * documented detail: weekday allows 0-7 where both 0 and 7 mean Sunday.
 */
export const MAX_CRON_EXPRESSION_CHARS = 256

export interface CronFieldBounds {
  readonly min: number
  readonly max: number
}

/** Minutes, hours, day-of-month, month, day-of-week. */
export const CRON_FIELD_BOUNDS: readonly CronFieldBounds[] = [
  { min: 0, max: 59 },
  { min: 0, max: 23 },
  { min: 1, max: 31 },
  { min: 1, max: 12 },
  { min: 0, max: 7 },
]

export const CRON_FIELD_LABELS = [
  'Minutes',
  'Hours',
  'Day of month',
  'Month',
  'Day of week',
] as const

export type CronErrorKind =
  | 'empty'
  | 'too-large'
  | 'field-count'
  | 'malformed'
  | 'names'
  | 'out-of-range'
  | 'invalid-step'
  | 'reversed-range'

/** One field, explained: raw text, its expanded values, and a short summary. */
export interface CronFieldBreakdown {
  readonly label: string
  readonly raw: string
  /** Sorted, de-duplicated expansion of the field. */
  readonly values: readonly number[]
  readonly summary: string
  /** A fixed note where the field semantics deserve one (weekday 0/7). */
  readonly note?: string
}

export interface CronSuccess {
  readonly ok: true
  readonly fields: readonly CronFieldBreakdown[]
}

export interface CronFailure {
  readonly ok: false
  readonly kind: CronErrorKind
  /** Fixed wording with fixed field labels; never echoes the raw expression. */
  readonly message: string
}

export type CronResult = CronSuccess | CronFailure