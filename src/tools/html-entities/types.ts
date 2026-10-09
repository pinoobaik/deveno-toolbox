/**
 * Coverage is exact and deliberately small: the five named entities every HTML
 * tool needs, plus decimal and hexadecimal numeric references. No claim is made
 * of full HTML5 entity coverage; any name outside this list is left untouched.
 */
export const MAX_HTML_CHARS = 100_000

/** The named entities this tool knows. Anything else stays verbatim. */
export const NAMED_ENTITIES: Readonly<Record<string, string>> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
}

export type HtmlMode = 'encode' | 'decode'

export type HtmlErrorKind = 'empty' | 'too-large'

export interface HtmlSuccess {
  readonly ok: true
  readonly text: string
  /** Named and numeric references decoded, or characters encoded. */
  readonly replacements: number
}

export interface HtmlFailure {
  readonly ok: false
  readonly kind: HtmlErrorKind
  /** Fixed wording; never echoes the input. */
  readonly message: string
}

export type HtmlResult = HtmlSuccess | HtmlFailure