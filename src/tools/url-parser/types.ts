/**
 * Parsing is synchronous and bounded, so it is safe to run on every keystroke.
 * The URL and any base stay under this many characters so a pasted blob never
 * stalls the page or bloats the breakdown.
 */
export const MAX_URL_CHARS = 8192

export type UrlParseErrorKind = 'empty' | 'too-large' | 'missing-base' | 'malformed'

/** One parsed URL, split exactly the way the WHATWG `URL` API exposes it. */
export interface ParsedUrl {
  /** `https:` */
  readonly protocol: string
  /** Lowercased hostname; IPv6 addresses keep their brackets. */
  readonly hostname: string
  /** Explicit port, or an empty string when the scheme default (or none) applies. */
  readonly port: string
  readonly pathname: string
  /** `?…` query including the `?`, or empty. */
  readonly search: string
  /** `#…` fragment including the `#`, or empty. */
  readonly hash: string
  readonly username: string
  /** Never echoed; the UI masks it. */
  readonly password: string
  /** Scheme + authority, e.g. `https://example.com:8080`. `null` for opaque schemes. */
  readonly origin: string | null
  readonly href: string
  /** True when the input was relative and resolved against an explicit base. */
  readonly isRelative: boolean
  /** True when the URL actually has a host (e.g. `mailto:` does not). */
  readonly hasAuthority: boolean
}

export interface UrlParseSuccess {
  readonly ok: true
  readonly url: ParsedUrl
}

export interface UrlParseFailure {
  readonly ok: false
  readonly kind: UrlParseErrorKind
  /** Fixed wording; never echoes the input, the base, or the engine's exception text. */
  readonly message: string
}

export type UrlParseResult = UrlParseSuccess | UrlParseFailure