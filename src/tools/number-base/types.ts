/**
 * Largest input the tool will convert.
 *
 * Conversion is exact big integer arithmetic, so the cost grows with the number
 * of digits rather than exploding, but the result still has to be rendered and
 * copied. A few hundred digits is far more than any real identifier or hash and
 * keeps a single run instant.
 */
export const MAX_NUMBER_INPUT_CHARS = 512

export type NumberBase = 2 | 8 | 10 | 16

export type NumberErrorKind = 'empty' | 'too-large' | 'invalid' | 'invalid-digit'

/** Prefix written with the output, or nothing for plain decimal. */
export const BASE_PREFIX: Record<NumberBase, string> = {
  2: '0b',
  8: '0o',
  10: '',
  16: '0x',
}

export const BASE_LABELS: Record<NumberBase, string> = {
  2: 'Binary',
  8: 'Octal',
  10: 'Decimal',
  16: 'Hexadecimal',
}

export const DEFAULT_FROM_BASE: NumberBase = 10
export const DEFAULT_TO_BASE: NumberBase = 16

export interface NumberSuccess {
  readonly ok: true
  readonly text: string
}

export interface NumberFailure {
  readonly ok: false
  readonly kind: NumberErrorKind
  /** Fixed wording. Digit problems report a 1-based position, never the character. */
  readonly message: string
}

export type NumberResult = NumberSuccess | NumberFailure
