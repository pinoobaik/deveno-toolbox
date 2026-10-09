import { MAX_URL_CHARS, type UrlParseErrorKind, type UrlParseFailure, type UrlParseResult } from './types'

const EMPTY_MESSAGE = 'Nothing to parse. Enter a URL first.'

const TOO_LARGE_MESSAGE = `Input is larger than the ${MAX_URL_CHARS.toLocaleString('en-US')} character limit.`

const MISSING_BASE_MESSAGE = 'This looks like a relative address. Provide a base URL to resolve it.'

const MALFORMED_MESSAGE = 'The URL cannot be parsed, even against the provided base.'

/** A URL scheme prefix as the WHATWG standard defines it: `scheme:`. */
const SCHEME_PATTERN = /^[A-Za-z][A-Za-z0-9+.-]*:/

function failure(kind: UrlParseErrorKind, message: string): UrlParseFailure {
  return { ok: false, kind, message }
}

/**
 * Parses a URL using the WHATWG `URL` API, which is native, safe, and keeps
 * entirely inside this tab -- nothing is fetched, navigated, or executed.
 *
 * An absolute URL parses on its own. A relative one is only ever resolved when
 * an explicit base is provided: there is no silent base invention. When an
 * absolute parse fails and no base was given, the error depends on whether the
 * input looks like it has a scheme -- a broken absolute URL and a relative
 * address need different advice.
 *
 * Credentials are exposed as parsed so the UI can label them, but the password
 * is a field the component masks rather than renders. Errors are fixed
 * messages; the input and any engine wording are never echoed.
 */
export function parseUrl(input: string, baseInput: string): UrlParseResult {
  if (input.length === 0) return failure('empty', EMPTY_MESSAGE)
  if (input.length > MAX_URL_CHARS) return failure('too-large', TOO_LARGE_MESSAGE)

  const trimmed = input.trim()
  if (trimmed.length === 0) return failure('empty', EMPTY_MESSAGE)

  const base = baseInput.trim()
  let parsed: URL | null = null
  let isRelative = false

  try {
    parsed = new URL(trimmed)
  } catch {
    if (base.length === 0) {
      const hasScheme = SCHEME_PATTERN.test(trimmed)
      return failure(hasScheme ? 'malformed' : 'missing-base', hasScheme ? MALFORMED_MESSAGE : MISSING_BASE_MESSAGE)
    }

    try {
      parsed = new URL(trimmed, base)
      isRelative = true
    } catch {
      return failure('malformed', MALFORMED_MESSAGE)
    }
  }

  if (parsed === null) return failure('malformed', MALFORMED_MESSAGE)

  return {
    ok: true,
    url: {
      protocol: parsed.protocol,
      hostname: parsed.hostname,
      port: parsed.port,
      pathname: parsed.pathname,
      search: parsed.search,
      hash: parsed.hash,
      username: parsed.username,
      password: parsed.password,
      origin: parsed.origin,
      href: parsed.href,
      isRelative,
      hasAuthority: parsed.hostname.length > 0,
    },
  }
}