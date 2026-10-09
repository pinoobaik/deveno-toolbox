import {
  MAX_URL_INPUT_CHARS,
  type UrlErrorKind,
  type UrlFailure,
  type UrlMode,
  type UrlResult,
  type UrlScope,
} from './types'

/** A `%` that is not followed by two hexadecimal digits. */
const BAD_ESCAPE = /%(?![0-9A-Fa-f]{2})/

const EMPTY_MESSAGE = 'Nothing to convert. Paste some text first.'

const TOO_LARGE_MESSAGE = `Input is larger than the ${MAX_URL_INPUT_CHARS.toLocaleString('en-US')} character limit. Split it into smaller pieces.`

const DECODE_FALLBACK_MESSAGE =
  'The text could not be decoded: the percent escapes are malformed, or the bytes they stand for are not valid UTF-8.'

const ENCODE_MESSAGE =
  'This text contains a lone surrogate character, which cannot be written as a URI.'

function failure(kind: UrlErrorKind, message: string): UrlFailure {
  return { ok: false, kind, message }
}

/**
 * Percent-encodes or percent-decodes text, for a single URI component or for a
 * whole URI.
 *
 * The two scopes pick different platform functions on purpose: `encodeURIComponent`
 * escapes `?`, `#`, and `&` so a query value stays a value, while `encodeURI`
 * leaves those separators alone so an already assembled URI keeps its shape.
 *
 * Nothing is ever thrown at the caller: `URIError` from a lone surrogate or a
 * malformed `%` escape becomes a fixed, bounded message, and the only detail
 * taken from the input is the 1-based position of the offending `%`.
 */
export function transformUrl(input: string, mode: UrlMode, scope: UrlScope): UrlResult {
  if (input.length === 0) return failure('empty', EMPTY_MESSAGE)
  if (input.length > MAX_URL_INPUT_CHARS) return failure('too-large', TOO_LARGE_MESSAGE)

  const convert = selectConverter(mode, scope)

  try {
    return { ok: true, text: convert(input) }
  } catch {
    return failure('malformed', describeFailure(input, mode))
  }
}

function selectConverter(mode: UrlMode, scope: UrlScope): (text: string) => string {
  if (scope === 'component') {
    return mode === 'encode' ? encodeURIComponent : decodeURIComponent
  }
  return mode === 'encode' ? encodeURI : decodeURI
}

function describeFailure(input: string, mode: UrlMode): string {
  if (mode === 'encode') return ENCODE_MESSAGE

  const match = BAD_ESCAPE.exec(input)
  if (match === null) return DECODE_FALLBACK_MESSAGE

  const position = match.index + 1
  return `The % at position ${position} is not followed by two hexadecimal digits.`
}
