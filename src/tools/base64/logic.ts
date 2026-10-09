import { MAX_BASE64_INPUT_CHARS, type Base64ErrorKind, type Base64Failure, type Base64Result } from './types'

/** Bytes spread over one `String.fromCharCode` call, so the argument list stays bounded. */
const BYTE_CHUNK = 0x8000

/** ASCII whitespace that Base64 decoders are required to ignore. */
const WHITESPACE = /[\t\n\v\f\r ]/g

/** Standard Base64 alphabet plus optional trailing padding. */
const BASE64_PATTERN = /^[A-Za-z0-9+/]*={0,2}$/

/** Any character that has no business in Base64, padding included. */
const FOREIGN_CHARACTER = /[^A-Za-z0-9+/=]/

const EMPTY_MESSAGE = 'Nothing to convert. Paste some text first.'

const NOT_BASE64_MESSAGE =
  'This is not standard Base64 text. Only letters, digits, +, / and trailing = padding are accepted.'

const PADDING_MESSAGE = 'The = padding does not line up with the end of the text.'

const INCOMPLETE_MESSAGE =
  'This text is one character too short to be complete Base64. Check for a missing character.'

const UNDECODABLE_MESSAGE = 'The text could not be decoded as Base64.'

const NOT_UTF8_MESSAGE =
  'The decoded bytes are not valid UTF-8 text, so there is nothing readable to show. This tool converts text, not binary files.'

function failure(kind: Base64ErrorKind, message: string): Base64Failure {
  return { ok: false, kind, message }
}

function tooLarge(): Base64Failure {
  return failure(
    'too-large',
    `Input is larger than the ${MAX_BASE64_INPUT_CHARS.toLocaleString('en-US')} character limit. Split the text into smaller pieces.`,
  )
}

/**
 * Encodes text as standard Base64.
 *
 * Unicode goes through `TextEncoder`, so the bytes on the wire are UTF-8
 * rather than the host's legacy code page. The byte string is built in chunks
 * because spreading a whole document into a single `String.fromCharCode` call
 * would exhaust the argument list.
 *
 * Unpaired surrogates are replaced with U+FFFD by `TextEncoder` rather than
 * throwing, so encoding never fails on user input.
 */
export function encodeBase64(input: string): Base64Result {
  if (input.length === 0) return failure('empty', EMPTY_MESSAGE)
  if (input.length > MAX_BASE64_INPUT_CHARS) return tooLarge()

  const bytes = new TextEncoder().encode(input)
  let binary = ''

  for (let offset = 0; offset < bytes.length; offset += BYTE_CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + BYTE_CHUNK))
  }

  return { ok: true, text: btoa(binary) }
}

/**
 * Decodes standard Base64 back to UTF-8 text.
 *
 * Whitespace is removed first, unpadded input is padded back to a multiple of
 * four, and every rejection is a fixed message: neither the input nor the
 * engine's own error text is echoed to the UI. Text that is not valid UTF-8
 * after decoding is reported instead of being shown as mojibake.
 */
export function decodeBase64(input: string): Base64Result {
  if (input.length === 0) return failure('empty', EMPTY_MESSAGE)
  if (input.length > MAX_BASE64_INPUT_CHARS) return tooLarge()

  const text = input.replace(WHITESPACE, '')

  if (text.length === 0) return failure('empty', EMPTY_MESSAGE)

  if (FOREIGN_CHARACTER.test(text)) return failure('invalid', NOT_BASE64_MESSAGE)

  if (text.includes('=')) {
    if (!BASE64_PATTERN.test(text) || text.length % 4 !== 0) {
      return failure('invalid', PADDING_MESSAGE)
    }
  } else if (text.length % 4 === 1) {
    return failure('invalid', INCOMPLETE_MESSAGE)
  }

  const missing = (4 - (text.length % 4)) % 4
  const normalized = missing === 0 ? text : `${text}${'='.repeat(missing)}`

  let binary: string
  try {
    binary = atob(normalized)
  } catch {
    return failure('invalid', UNDECODABLE_MESSAGE)
  }

  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))

  try {
    return { ok: true, text: new TextDecoder('utf-8', { fatal: true }).decode(bytes) }
  } catch {
    return failure('not-text', NOT_UTF8_MESSAGE)
  }
}
