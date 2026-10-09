/**
 * Largest input the tool will convert.
 *
 * Percent-encoding can triple the length of the text and the result is derived
 * on every keystroke, so the cap keeps one keystroke's work bounded while still
 * holding a far longer URI than anyone edits by hand.
 */
export const MAX_URL_INPUT_CHARS = 200_000

export type UrlMode = 'encode' | 'decode'

/** `component` uses `encodeURIComponent`/`decodeURIComponent`, `full` uses the URI pair. */
export type UrlScope = 'component' | 'full'

export type UrlErrorKind = 'empty' | 'too-large' | 'malformed'

export interface UrlSuccess {
  readonly ok: true
  readonly text: string
}

export interface UrlFailure {
  readonly ok: false
  readonly kind: UrlErrorKind
  readonly message: string
}

export type UrlResult = UrlSuccess | UrlFailure
