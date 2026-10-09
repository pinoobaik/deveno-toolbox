/**
 * Largest token the tool will decode.
 *
 * A JWT carries a small JSON header and payload; real tokens are a few
 * hundred characters. A few kilobytes leaves room for large custom claims
 * while keeping the decode that runs on every keystroke trivial.
 */
export const MAX_JWT_TOKEN_CHARS = 8_192

export type JwtErrorKind =
  | 'empty'
  | 'too-large'
  | 'structure'
  | 'header-base64'
  | 'header-json'
  | 'payload-base64'
  | 'payload-json'

export interface JwtSuccess {
  readonly ok: true
  /** Header, pretty printed with two space indentation. */
  readonly header: string
  /** Payload, pretty printed with two space indentation. */
  readonly payload: string
  /** Third segment, exactly as it appeared in the token. Never decoded. */
  readonly signature: string
}

export interface JwtFailure {
  readonly ok: false
  readonly kind: JwtErrorKind
  readonly message: string
}

export type JwtResult = JwtSuccess | JwtFailure
