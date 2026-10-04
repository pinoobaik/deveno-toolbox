/**
 * Nesting levels accepted by `JSON.stringify`. The engine's own limit is far
 * higher but varies between runtimes, so the tool applies a fixed, documented
 * cap and reports a readable error instead of overflowing the stack.
 */
export const MAX_JSON_DEPTH = 256

/** Largest input the tool will parse, to keep per-keystroke work bounded. */
export const MAX_JSON_INPUT_CHARS = 1_000_000

export type JsonErrorKind = 'empty' | 'syntax' | 'too-large'

export interface JsonValidationSuccess {
  readonly valid: true
  readonly value: unknown
}

export interface JsonValidationFailure {
  readonly valid: false
  readonly kind: JsonErrorKind
  readonly message: string
  /** 1-based line number when it can be derived from the error position. */
  readonly line: number | null
  readonly column: number | null
}

export type JsonValidationResult = JsonValidationSuccess | JsonValidationFailure

/** Why an already parsed value could not be rendered back to text. */
export type JsonOutputErrorKind = 'too-deep' | 'unsupported'

export interface JsonOutputSuccess {
  readonly ok: true
  readonly text: string
}

export interface JsonOutputFailure {
  readonly ok: false
  readonly kind: JsonOutputErrorKind
  readonly message: string
}

export type JsonOutputResult = JsonOutputSuccess | JsonOutputFailure

export interface StringifyOptions {
  /** Indentation passed to `JSON.stringify`. Omit to produce minified output. */
  readonly indent?: 2 | 4 | '\t'
  /** Sort object keys before rendering. */
  readonly sortKeys?: boolean
}