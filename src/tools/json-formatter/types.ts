/** Indentation options available when pretty printing JSON. */
export type JsonIndent = 2 | 4 | 'tab'

export type JsonErrorKind = 'empty' | 'syntax' | 'unsupported'

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
