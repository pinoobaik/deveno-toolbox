/**
 * Largest input the tool will transform.
 *
 * Every mode walks the text at least once and Title/Sentence case walk it
 * twice, so the cap keeps one keystroke's work comfortably interactive while
 * still holding a long document.
 */
export const MAX_TEXT_CASE_INPUT_CHARS = 500_000

export type CaseMode = 'lower' | 'upper' | 'title' | 'sentence'

export type CaseErrorKind = 'empty' | 'too-large'

export interface CaseSuccess {
  readonly ok: true
  readonly text: string
}

export interface CaseFailure {
  readonly ok: false
  readonly kind: CaseErrorKind
  readonly message: string
}

export type CaseResult = CaseSuccess | CaseFailure
