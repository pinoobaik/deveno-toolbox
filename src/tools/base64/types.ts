/**
 * Largest input the tool will convert.
 *
 * Base64 encoding expands text by roughly 4/3 and the UI re-runs the whole
 * conversion on every keystroke, so the cap keeps a single keystroke's work in
 * the low tens of milliseconds while still holding several pages of text.
 */
export const MAX_BASE64_INPUT_CHARS = 500_000

export type Base64Mode = 'encode' | 'decode'

export type Base64ErrorKind = 'empty' | 'too-large' | 'invalid' | 'not-text'

export interface Base64Success {
  readonly ok: true
  readonly text: string
}

export interface Base64Failure {
  readonly ok: false
  readonly kind: Base64ErrorKind
  readonly message: string
}

export type Base64Result = Base64Success | Base64Failure
