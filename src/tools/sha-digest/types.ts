/**
 * Largest input the tool will hash.
 *
 * A digest is computed in one pass over the UTF-8 bytes and produces a fixed
 * size result, so there is no expansion to bound. The cap matches the largest
 * input the rest of the app already accepts and keeps a single run short enough
 * to stay responsive in the main thread.
 */
export const MAX_SHA_INPUT_CHARS = 1_000_000

/** Algorithms offered by the Web Crypto API that this tool exposes. */
export const SHA_ALGORITHMS = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'] as const

export type ShaAlgorithm = (typeof SHA_ALGORITHMS)[number]

export const DEFAULT_SHA_ALGORITHM: ShaAlgorithm = 'SHA-256'

export type ShaErrorKind = 'empty' | 'too-large' | 'unsupported' | 'unavailable' | 'failed'

export interface ShaSuccess {
  readonly ok: true
  /** Lowercase hexadecimal digest. */
  readonly text: string
}

export interface ShaFailure {
  readonly ok: false
  readonly kind: ShaErrorKind
  readonly message: string
}

export type ShaResult = ShaSuccess | ShaFailure
