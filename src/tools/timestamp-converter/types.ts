export type TimestampErrorKind = 'empty' | 'invalid-number' | 'out-of-range' | 'invalid-date'

export interface TimestampResultSuccess {
  readonly ok: true
  readonly seconds: number
  readonly milliseconds: number
  readonly localIso: string
  readonly utcIso: string
  readonly localDisplay: string
  readonly utcDisplay: string
  readonly isValidDate: boolean
}

export interface TimestampResultFailure {
  readonly ok: false
  readonly kind: TimestampErrorKind
  readonly message: string
}

export type TimestampResult = TimestampResultSuccess | TimestampResultFailure

/** Lowest / highest representable instant in the ECMAScript Date range. */
export const MIN_TIMESTAMP_MS = -8_640_000_000_000_000
export const MAX_TIMESTAMP_MS = 8_640_000_000_000_000
