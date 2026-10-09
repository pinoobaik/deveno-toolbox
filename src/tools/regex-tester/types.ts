/**
 * Limits are deliberate: matching runs synchronously in the browser tab, so a
 * pattern that backtracks badly could stall the page. The input is capped and
 * the pattern length is capped, and the tool only reports matching is
 * request-time so the worst case is bounded to a run the user asked for. It can
 * still be slow -- no claim is made otherwise.
 */
export const MAX_PATTERN_CHARS = 512

export const MAX_TEST_TEXT_CHARS = 50_000

/**
 * Matches collected before collection stops. A single string can contain far
 * more matches than is useful to render, and every collected match is held in
 * memory as text plus indices.
 */
export const MAX_MATCH_LIMIT = 1_000

/**
 * The explicitly supported flags. `y` (sticky) is a flag in its own right
 * rather than a substitute for `g`; `d` is rejected so match indices come from
 * this tool's own arithmetic and stay identical across engines.
 */
export const SUPPORTED_FLAGS = 'gimsuy' as const

export const DEFAULT_FLAGS = 'g' as const

export type RegexErrorKind = 'empty' | 'too-large' | 'bad-flag' | 'bad-syntax'

export type MatchErrorKind = 'empty-text' | 'too-large-text'

/** One match, with 0-based boundaries into the test text. */
export interface RegexMatch {
  readonly text: string
  readonly start: number
  readonly end: number
  /** Capture groups 1..n. An optional group that took part in no match is `undefined`. */
  readonly groups: readonly (string | undefined)[]
}

export interface PatternValid {
  readonly ok: true
  readonly regex: RegExp
}

export interface PatternFailure {
  readonly ok: false
  readonly kind: RegexErrorKind
  /** Fixed wording; never echoes the pattern or the engine's exception text. */
  readonly message: string
}

export type PatternCheck = PatternValid | PatternFailure

export interface MatchSuccess {
  readonly ok: true
  readonly matches: readonly RegexMatch[]
  /** Matches that were actually collected (never above `MAX_MATCH_LIMIT`). */
  readonly count: number
  /**
   * True when the text held more matches than `MAX_MATCH_LIMIT` and collection
   * stopped early. The caller should surface this honestly.
   */
  readonly truncated: boolean
}

export interface MatchFailure {
  readonly ok: false
  readonly kind: MatchErrorKind
  /** Fixed wording; never echoes the pattern or the input. */
  readonly message: string
}

export type MatchResult = MatchSuccess | MatchFailure